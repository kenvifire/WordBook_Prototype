import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
  FieldValue: {
    arrayUnion: (...values: unknown[]) => ({ __fakeArrayUnion: true, values }),
    serverTimestamp: () => ({ __fakeServerTimestamp: true }),
  },
}));

vi.mock('@/lib/firebase/admin', () => ({ getAdminApp: vi.fn(() => ({})) }));

vi.mock('@/lib/ai/deepseek', () => ({
  generateStory: vi.fn(),
}));

vi.mock('@/lib/translate/translateApi', () => ({
  translateWord: vi.fn(),
}));

vi.mock('@/lib/users/userProfile', () => ({
  getUserProfile: vi.fn(),
}));

import { getFirestore } from 'firebase-admin/firestore';
import { generateStory } from '@/lib/ai/deepseek';
import { translateWord } from '@/lib/translate/translateApi';
import { getUserProfile } from '@/lib/users/userProfile';
import { buildWordId } from '@/lib/firebase/wordId';
import { startGeneratingBook } from './generateBook';

const mockGetFirestore = getFirestore as unknown as ReturnType<typeof vi.fn>;
const mockGenerateStory = generateStory as unknown as ReturnType<typeof vi.fn>;
const mockTranslateWord = translateWord as unknown as ReturnType<typeof vi.fn>;
const mockGetUserProfile = getUserProfile as unknown as ReturnType<typeof vi.fn>;

type StoredDoc = Record<string, unknown>;

// Same in-memory-fake-Firestore style as lib/books/bookService.test.ts and
// lib/sections/sectionService.test.ts (per AGENTS.md's "match it rather
// than inventing a new one"), trimmed down to what generateBook.ts
// actually uses: collection/doc/add/get/create/update and a simple batch.
// No runTransaction fake needed — generateBook.ts never uses one.
function createFakeFirestore() {
  const store = new Map<string, StoredDoc>();
  let counter = 0;
  const nextId = () => `auto-${++counter}`;

  function isArrayUnion(value: unknown): value is { __fakeArrayUnion: true; values: unknown[] } {
    return (
      typeof value === 'object' &&
      value !== null &&
      (value as { __fakeArrayUnion?: unknown }).__fakeArrayUnion === true
    );
  }

  function applyFieldValue(existing: unknown, incoming: unknown): unknown {
    if (isArrayUnion(incoming)) {
      const base = Array.isArray(existing) ? existing : [];
      const toAdd = incoming.values.filter(
        (v) => !base.some((b) => JSON.stringify(b) === JSON.stringify(v))
      );
      return [...base, ...toAdd];
    }
    return incoming;
  }

  function applyUpdate(path: string, data: Record<string, unknown>): void {
    const existing = store.get(path);
    if (!existing) {
      throw new Error(`No document to update at ${path}`);
    }
    const updated: StoredDoc = { ...existing };
    for (const [key, value] of Object.entries(data)) {
      updated[key] = applyFieldValue(existing[key], value);
    }
    store.set(path, updated);
  }

  function makeDocRef(path: string): any {
    const id = path.split('/').pop()!;
    return {
      id,
      path,
      async get() {
        const data = store.get(path);
        return {
          exists: data !== undefined,
          id,
          data: () => (data ? { ...data } : undefined),
        };
      },
      async create(data: Record<string, unknown>) {
        // No await before this check: the whole check-then-set body runs
        // as one synchronous tick, matching real Firestore's atomic
        // ALREADY_EXISTS semantics for two "concurrent" callers.
        if (store.has(path)) {
          const err: Error & { code?: number } = new Error(
            `6 ALREADY_EXISTS: Document already exists: ${path}`
          );
          err.code = 6;
          throw err;
        }
        store.set(path, { ...data });
        return {};
      },
      async update(data: Record<string, unknown>) {
        applyUpdate(path, data);
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
          ops.push(() => applyUpdate(ref.path, data));
        },
        async commit() {
          for (const op of ops) op();
        },
      };
    },
  };

  return { db, store };
}

function sectionsForBook(store: Map<string, StoredDoc>, bookId: string) {
  const prefix = `books/${bookId}/sections/`;
  return Array.from(store.entries())
    .filter(([path]) => path.startsWith(prefix))
    .map(([path, data]) => ({ id: path.slice(prefix.length), ...data }))
    .sort((a, b) => (a as any).sectionNumber - (b as any).sectionNumber);
}

function wordDocsForUser(store: Map<string, StoredDoc>, userId: string) {
  const prefix = `words/${userId}_`;
  return Array.from(store.entries()).filter(([path]) => path.startsWith(prefix));
}

function makeInput(overrides: Partial<Parameters<typeof startGeneratingBook>[0]> = {}) {
  return {
    topic: 'a brave fox',
    difficulty: 'intermediate' as const,
    language: 'english',
    targetWordCount: 10,
    userId: 'user-1',
    ...overrides,
  };
}

// Deterministic story text long enough that splitByFixedWordCount (150
// words/section) produces more than one section, so tests can check that
// every section — not just the first — gets a well-formed wordIds link.
function longStoryText(wordCount: number): string {
  return Array.from({ length: wordCount }, (_, i) => `filler${i}`).join(' ');
}

beforeEach(() => {
  mockGenerateStory.mockReset();
  mockTranslateWord.mockReset();
  mockTranslateWord.mockResolvedValue(null);
  mockGetUserProfile.mockReset();
  mockGetUserProfile.mockResolvedValue({
    nativeLanguage: null,
    avatarUrl: null,
    theme: 'system',
    recognitionThreshold: 0.8,
  });
});

describe('startGeneratingBook', () => {
  test('creates a pending book doc immediately and returns before generation resolves', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);

    // Never resolves during this test — a never-settling promise, so if
    // startGeneratingBook's own await/return ever depended on it, this
    // test would simply hang/time out instead of completing.
    let resolveGeneration: ((value: unknown) => void) | undefined;
    mockGenerateStory.mockReturnValue(
      new Promise((resolve) => {
        resolveGeneration = resolve;
      })
    );

    const { bookId } = await startGeneratingBook(makeInput());

    const bookDoc = store.get(`books/${bookId}`) as any;
    expect(bookDoc).toMatchObject({
      userId: 'user-1',
      title: 'a brave fox',
      author: null,
      format: 'text',
      language: 'english',
      source: 'ai_generated',
      sectioningMethod: 'fixed_word_count',
      pagesPerSection: null,
      detectedChapterBreaks: null,
      topic: 'a brave fox',
      difficultyLevel: 'intermediate',
      targetWordCount: 10,
      generationStatus: 'pending',
    });
    expect(bookDoc.createdAt).toEqual({ __fakeServerTimestamp: true });

    // Nothing downstream of generateStory has happened yet.
    expect(sectionsForBook(store, bookId)).toHaveLength(0);
    expect(wordDocsForUser(store, 'user-1')).toHaveLength(0);

    // Clean up the dangling promise so it doesn't stay pending forever.
    resolveGeneration?.({ title: 'T', text: longStoryText(5), vocabulary: [] });
  });

  test('on successful generation, writes sections (fixed word count) and words from the vocabulary list, then sets generationStatus: ready', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetUserProfile.mockResolvedValue({
      nativeLanguage: 'spanish',
      avatarUrl: null,
      theme: 'system',
      recognitionThreshold: 0.8,
    });
    mockTranslateWord.mockImplementation((word: string) => Promise.resolve(`def-${word}`));

    // 320 filler words -> 3 sections of 150/150/20 words via splitByFixedWordCount.
    const storyText = longStoryText(320);
    mockGenerateStory.mockResolvedValue({
      title: 'The Brave Fox',
      text: storyText,
      vocabulary: ['glimmer', 'wander'],
    });

    const { bookId } = await startGeneratingBook(makeInput());

    await vi.waitFor(() => {
      const bookDoc = store.get(`books/${bookId}`) as any;
      expect(bookDoc?.generationStatus).toBe('ready');
    });

    const bookDoc = store.get(`books/${bookId}`) as any;
    expect(bookDoc.title).toBe('The Brave Fox');

    const sections = sectionsForBook(store, bookId);
    expect(sections).toHaveLength(3);
    expect(sections[0]).toMatchObject({ sectionNumber: 1, status: 'ready_to_practice' });
    expect(sections[1]).toMatchObject({ sectionNumber: 2, status: 'locked' });
    expect(sections[2]).toMatchObject({ sectionNumber: 3, status: 'locked' });

    const glimmerId = buildWordId('user-1', 'english', 'glimmer');
    const wanderId = buildWordId('user-1', 'english', 'wander');

    // Every generated word is linked to every section (see generateBook.ts's
    // own comment on why: a single flat vocabulary list has no per-section
    // breakdown to trust instead).
    for (const section of sections) {
      expect((section as any).wordIds).toEqual(expect.arrayContaining([glimmerId, wanderId]));
      expect((section as any).wordIds).toHaveLength(2);
    }

    const glimmerDoc = store.get(`words/${glimmerId}`) as any;
    const wanderDoc = store.get(`words/${wanderId}`) as any;
    expect(glimmerDoc).toMatchObject({
      userId: 'user-1',
      word: 'glimmer',
      language: 'english',
      definition: 'def-glimmer',
      repetitions: 0,
      easeFactor: 2.5,
      intervalDays: 1,
      lastRating: null,
      addedFromReader: false,
    });
    expect(wanderDoc.definition).toBe('def-wander');

    expect(glimmerDoc.sectionRefs).toHaveLength(3);
    expect(glimmerDoc.sectionRefs).toEqual(
      expect.arrayContaining(sections.map((s) => ({ bookId, sectionId: s.id })))
    );

    expect(mockTranslateWord).toHaveBeenCalledWith('glimmer', 'english', 'spanish');
    expect(mockTranslateWord).toHaveBeenCalledWith('wander', 'english', 'spanish');
  });

  test('on a generateStory failure, sets generationStatus: failed and creates no sections/words', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGenerateStory.mockRejectedValue(new Error('DeepSeek is down'));

    const { bookId } = await startGeneratingBook(makeInput());

    await vi.waitFor(() => {
      const bookDoc = store.get(`books/${bookId}`) as any;
      expect(bookDoc?.generationStatus).toBe('failed');
    });

    expect(sectionsForBook(store, bookId)).toHaveLength(0);
    expect(wordDocsForUser(store, 'user-1')).toHaveLength(0);
  });

  test('two concurrent calls for the same user create two independent book docs with independent statuses', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);

    mockGenerateStory.mockImplementation((input: { topic: string }) => {
      if (input.topic === 'succeeds') {
        return Promise.resolve({
          title: 'Success Story',
          text: longStoryText(10),
          vocabulary: ['onlyword'],
        });
      }
      return Promise.reject(new Error('this one fails'));
    });

    const [{ bookId: successId }, { bookId: failId }] = await Promise.all([
      startGeneratingBook(makeInput({ topic: 'succeeds' })),
      startGeneratingBook(makeInput({ topic: 'fails' })),
    ]);

    expect(successId).not.toBe(failId);

    // Both book docs exist independently as soon as startGeneratingBook
    // returns — two distinct Firestore documents, not one shared slot.
    expect(store.has(`books/${successId}`)).toBe(true);
    expect(store.has(`books/${failId}`)).toBe(true);

    await vi.waitFor(() => {
      expect((store.get(`books/${successId}`) as any).generationStatus).toBe('ready');
      expect((store.get(`books/${failId}`) as any).generationStatus).toBe('failed');
    });

    // The failed generation's book doc never gets any sections/words, and
    // the two books' sections are never mixed up with each other.
    expect(sectionsForBook(store, failId)).toHaveLength(0);
    expect(sectionsForBook(store, successId).length).toBeGreaterThan(0);
  });

  test('the same word appearing twice in the vocabulary list creates exactly one word doc without crashing', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGenerateStory.mockResolvedValue({
      title: 'Repeats',
      text: longStoryText(10),
      vocabulary: ['dup', 'dup'],
    });

    const { bookId } = await startGeneratingBook(makeInput());

    await vi.waitFor(() => {
      const bookDoc = store.get(`books/${bookId}`) as any;
      expect(bookDoc?.generationStatus).toBe('ready');
    });

    expect(wordDocsForUser(store, 'user-1')).toHaveLength(1);
  });
});
