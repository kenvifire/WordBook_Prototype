import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
  FieldValue: {
    arrayUnion: (...values: unknown[]) => ({ __fakeArrayUnion: true, values }),
    // A real toDate() (not just a marker object) so listBooks' isPendingStale
    // helper — which calls createdAt.toDate() — works against a book doc
    // created via addBook/startGeneratingBook in this file's tests.
    serverTimestamp: () => ({ toDate: () => new Date() }),
  },
}));

vi.mock('@/lib/firebase/admin', () => ({ getAdminApp: vi.fn(() => ({})) }));

vi.mock('@/lib/translate/translateApi', () => ({
  translateWord: vi.fn(),
}));

vi.mock('@/lib/users/userProfile', () => ({
  getUserProfile: vi.fn(),
}));

vi.mock('@/lib/text/detectLanguage', () => ({
  detectLanguage: vi.fn(() => 'english'),
}));

vi.mock('@/lib/text/detectChapters', () => ({
  detectChapterBreaksByHeading: vi.fn(() => null),
  detectChapterBreaksFromTitles: vi.fn(() => null),
}));

vi.mock('@/lib/storage/pendingBookText', () => ({
  savePendingBookText: vi.fn(async () => {}),
  readPendingBookText: vi.fn(async () => ''),
  deletePendingBookText: vi.fn(async () => {}),
}));

vi.mock('@/lib/ai/deepseek', () => ({
  generateStory: vi.fn(),
}));

import { getFirestore } from 'firebase-admin/firestore';
import { translateWord } from '@/lib/translate/translateApi';
import { getUserProfile } from '@/lib/users/userProfile';
import { generateStory } from '@/lib/ai/deepseek';
import { invalidatePrefix } from '@/lib/cache/serverCache';
import { listBooks } from './listBooks';
import { addBook } from './bookService';
import { startGeneratingBook } from './generateBook';

const mockGetFirestore = getFirestore as unknown as ReturnType<typeof vi.fn>;
const mockTranslateWord = translateWord as unknown as ReturnType<typeof vi.fn>;
const mockGetUserProfile = getUserProfile as unknown as ReturnType<typeof vi.fn>;
const mockGenerateStory = generateStory as unknown as ReturnType<typeof vi.fn>;

type StoredDoc = Record<string, unknown>;

// A fake Firestore combining what listBooks needs (collection('books')
// .where().orderBy().get(), plus a sections subcollection .get() per book)
// with what addBook/startGeneratingBook need (collection('books').add(),
// doc().update(), a trivial batch) — same in-memory-Map style as
// lib/books/bookService.test.ts and lib/books/generateBook.test.ts (see
// AGENTS.md's "match it rather than inventing a new one").
function createFakeFirestore() {
  const store = new Map<string, StoredDoc>();
  const booksGetCalls: string[] = [];
  let counter = 0;
  const nextId = () => `auto-${++counter}`;

  function makeDocRef(path: string): any {
    const id = path.split('/').pop()!;
    return {
      id,
      path,
      async get() {
        const data = store.get(path);
        return { exists: data !== undefined, id, data: () => (data ? { ...data } : undefined) };
      },
      async update(data: Record<string, unknown>) {
        const existing = store.get(path) ?? {};
        store.set(path, { ...existing, ...data });
      },
      async delete() {
        store.delete(path);
      },
      collection(name: string) {
        return makeCollectionRef(`${path}/${name}`);
      },
    };
  }

  function makeCollectionRef(path: string): any {
    return {
      path,
      doc(id?: string) {
        return makeDocRef(`${path}/${id ?? nextId()}`);
      },
      async add(data: Record<string, unknown>) {
        const ref = makeDocRef(`${path}/${nextId()}`);
        store.set(ref.path, { ...data });
        return ref;
      },
      async get() {
        // Plain, unfiltered collection.get() — used for a book's `sections`
        // subcollection. Matches docs stored directly under this path (one
        // segment deeper, no further nesting).
        const prefix = `${path}/`;
        const docs = Array.from(store.entries())
          .filter(([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes('/'))
          .map(([key, data]) => ({ id: key.slice(prefix.length), data: () => ({ ...data }) }));
        return { empty: docs.length === 0, docs };
      },
      where(field: string, op: string, value: unknown) {
        if ((path !== 'books' && path !== 'words') || field !== 'userId' || op !== '==') {
          throw new Error(`Unsupported filter in fake: ${path} ${field} ${op}`);
        }
        if (path === 'words') {
          // Plain equality filter for generateBook.ts's known-words lookup —
          // no orderBy, no call tracking (booksGetCalls is books-specific).
          return {
            async get() {
              const prefix = 'words/';
              const docs = Array.from(store.entries())
                .filter(([key, data]) => key.startsWith(prefix) && (data as any).userId === value)
                .map(([, data]) => ({ data: () => ({ ...data }) }));
              return { docs };
            },
          };
        }
        return {
          orderBy() {
            return this;
          },
          async get() {
            booksGetCalls.push(value as string);
            const docs = Array.from(store.entries())
              .filter(([key, data]) => key.startsWith('books/') && !key.includes('/sections/') && (data as any).userId === value)
              .map(([key, data]) => ({ id: key.slice('books/'.length), data: () => ({ ...data }) }));
            return { empty: docs.length === 0, docs };
          },
        };
      },
    };
  }

  const db = {
    collection(name: string) {
      return makeCollectionRef(name);
    },
    batch() {
      const ops: Array<() => void> = [];
      return {
        update(ref: { path: string }, data: Record<string, unknown>) {
          ops.push(() => {
            const existing = store.get(ref.path) ?? {};
            store.set(ref.path, { ...existing, ...data });
          });
        },
        async commit() {
          for (const op of ops) op();
        },
      };
    },
  };

  return { db, store, booksGetCalls };
}

beforeEach(() => {
  mockTranslateWord.mockReset();
  mockTranslateWord.mockResolvedValue(null);
  mockGetUserProfile.mockReset();
  mockGetUserProfile.mockResolvedValue({
    nativeLanguage: null,
    avatarUrl: null,
    theme: 'system',
    recognitionThreshold: 0.8,
  });
  // listBooks' cache is module-level state shared across tests in this
  // file, and every test here reuses the same uid ('u1') with different
  // expected book lists — clear it so one test's cached result never
  // leaks into another's (same fix as sectionService.test.ts/
  // userProfile.test.ts needed for the profile cache).
  invalidatePrefix('books:');
});

describe('listBooks caching', () => {
  test('a second listBooks call for the same uid does not re-query Firestore', async () => {
    const { db, store, booksGetCalls } = createFakeFirestore();
    store.set('books/book-1', { userId: 'u1', title: 'Book One', language: 'english' });
    mockGetFirestore.mockReturnValue(db);

    await listBooks('u1');
    await listBooks('u1');

    expect(booksGetCalls).toHaveLength(1);
  });

  test('addBook invalidates the cached list so a newly uploaded book appears on the next call', async () => {
    const { db } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);

    const before = await listBooks('u1');
    expect(before).toHaveLength(0);

    await addBook({
      title: 'New Upload',
      format: 'text',
      rawText: 'hello world',
      userId: 'u1',
    });

    const after = await listBooks('u1');
    expect(after.map((b) => b.title)).toContain('New Upload');
  });

  test('startGeneratingBook invalidates the cached list so the new pending book appears immediately', async () => {
    const { db } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    // Never resolves within this test, so the fire-and-forget background
    // generation (lib/books/generateBook.ts's runGeneration) never advances
    // past its first await — the book doc stays genuinely 'pending' for the
    // assertion below, rather than racing to 'ready'/'failed' on an
    // unrelated microtask tick.
    mockGenerateStory.mockImplementation(() => new Promise(() => {}));

    const before = await listBooks('u1');
    expect(before).toHaveLength(0);

    await startGeneratingBook({
      topic: 'A Story About Dragons',
      difficulty: 'beginner',
      language: 'english',
      targetWordCount: 150,
      newWordPercentage: 50,
      userId: 'u1',
    });

    const after = await listBooks('u1');
    expect(after).toHaveLength(1);
    expect(after[0]).toMatchObject({ title: 'A Story About Dragons', generationStatus: 'pending' });
  });

  // BookshelfPendingPoller refreshes every 3s specifically to catch the
  // background generation's 'pending' -> 'ready'/'failed' transition; a
  // cached 'pending' list surviving that transition for listBooks' 15s TTL
  // would defeat it. Each test below warms the cache while the book is
  // genuinely pending, lets runGeneration finish, then re-lists.
  function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  async function startAndWarmPending() {
    const { bookId } = await startGeneratingBook({
      topic: 'A Story About Dragons',
      difficulty: 'beginner',
      language: 'english',
      targetWordCount: 150,
      newWordPercentage: 50,
      userId: 'u1',
    });
    const warm = await listBooks('u1');
    expect(warm).toHaveLength(1);
    expect(warm[0]).toMatchObject({ id: bookId, generationStatus: 'pending' });
    return bookId;
  }

  test('runGeneration invalidates the cached list when generation succeeds, so the book shows as ready on the next call', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    const story = deferred<{ title: string; text: string; vocabulary: string[] }>();
    mockGenerateStory.mockReturnValue(story.promise);

    const bookId = await startAndWarmPending();

    story.resolve({ title: 'The Dragon Tale', text: 'once upon a time a dragon flew', vocabulary: [] });
    await vi.waitFor(() => {
      expect(store.get(`books/${bookId}`)?.generationStatus).toBe('ready');
    });

    const after = await listBooks('u1');
    expect(after).toHaveLength(1);
    expect(after[0]).toMatchObject({ id: bookId, title: 'The Dragon Tale', generationStatus: 'ready' });
    expect(after[0].sectionsTotal).toBeGreaterThan(0);
  });

  test('runGeneration invalidates the cached list when generation fails, so the book shows as failed on the next call', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    const story = deferred<{ title: string; text: string; vocabulary: string[] }>();
    mockGenerateStory.mockReturnValue(story.promise);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const bookId = await startAndWarmPending();

      story.reject(new Error('DeepSeek unavailable'));
      await vi.waitFor(() => {
        expect(store.get(`books/${bookId}`)?.generationStatus).toBe('failed');
      });

      const after = await listBooks('u1');
      expect(after).toHaveLength(1);
      expect(after[0]).toMatchObject({ id: bookId, generationStatus: 'failed' });
    } finally {
      consoleError.mockRestore();
    }
  });
});
