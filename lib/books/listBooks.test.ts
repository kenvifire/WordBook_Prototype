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
        if (path !== 'books' || field !== 'userId' || op !== '==') {
          throw new Error(`Unsupported filter in fake: ${path} ${field} ${op}`);
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
      userId: 'u1',
    });

    const after = await listBooks('u1');
    expect(after).toHaveLength(1);
    expect(after[0]).toMatchObject({ title: 'A Story About Dragons', generationStatus: 'pending' });
  });
});
