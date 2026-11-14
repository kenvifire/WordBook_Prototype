import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
  FieldValue: {
    arrayUnion: (...values: unknown[]) => ({ __fakeArrayUnion: true, values }),
    serverTimestamp: () => ({ __fakeServerTimestamp: true }),
  },
}));

vi.mock('@/lib/firebase/admin', () => ({ getAdminApp: vi.fn(() => ({})) }));

vi.mock('@/lib/dictionary/dictionaryApi', () => ({
  fetchDefinition: vi.fn(),
}));

import { getFirestore } from 'firebase-admin/firestore';
import { fetchDefinition } from '@/lib/dictionary/dictionaryApi';
import { addBook } from './bookService';

const mockGetFirestore = getFirestore as unknown as ReturnType<typeof vi.fn>;
const mockFetchDefinition = fetchDefinition as unknown as ReturnType<typeof vi.fn>;

// extractVocabulary tokenizes on [a-zA-Z']+, so digits in a word (e.g. "word0")
// get stripped and collapse distinct tokens together. Use letters-only suffixes
// (prefixed so they can't collide with any of the 1000 common words) to get
// genuinely distinct, non-common vocabulary candidates.
function uniqueWord(i: number): string {
  const first = String.fromCharCode(97 + Math.floor(i / 26));
  const second = String.fromCharCode(97 + (i % 26));
  return `zzzq${first}${second}`;
}

type StoredDoc = Record<string, unknown>;

// A fake Firestore backed by a real in-memory Map keyed by full document
// path, faithfully reproducing the semantics addBook's race-safety depends
// on: `.create()` throws (synchronously, with no await between the
// existence check and the write) when a document already exists at that
// path, exactly like real Firestore's server-side ALREADY_EXISTS rejection.
// This is NOT a call-recording stub — two concurrent callers racing against
// the same path really do see only one winner, because the check-then-set
// in `create()` never yields to the event loop in the middle.
function createFakeFirestore() {
  const store = new Map<string, StoredDoc>();
  const createAttempts = new Map<string, number>();
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
        createAttempts.set(path, (createAttempts.get(path) ?? 0) + 1);
        // No await before this check: the whole check-then-set body runs as
        // one synchronous tick, so two "concurrent" callers can never both
        // observe an empty slot.
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

  return { db, store, createAttempts };
}

function sectionsForBook(store: Map<string, StoredDoc>, bookId: string) {
  const prefix = `books/${bookId}/sections/`;
  return Array.from(store.entries())
    .filter(([path]) => path.startsWith(prefix))
    .map(([path, data]) => ({ id: path.slice(prefix.length), ...data }))
    .sort((a, b) => (a as any).sectionNumber - (b as any).sectionNumber);
}

function wordDoc(store: Map<string, StoredDoc>, userId: string, word: string) {
  return store.get(`words/${userId}_${word}`);
}

beforeEach(() => {
  mockFetchDefinition.mockReset();
  mockFetchDefinition.mockResolvedValue('a definition');
});

describe('addBook', () => {
  test('creates a book doc, one section subcollection doc per 150 words, section 1 ready_to_practice, rest locked', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);

    // 320 common words -> extractVocabulary yields no candidate words, so
    // this test only asserts book/section document shape.
    const rawText = Array.from({ length: 320 }, () => 'the').join(' ');

    const result = await addBook({
      title: 'Common Words Book',
      format: 'text',
      rawText,
      userId: 'user-1',
    });

    const bookDoc = store.get(`books/${result.bookId}`) as any;
    expect(bookDoc).toMatchObject({
      userId: 'user-1',
      title: 'Common Words Book',
      author: null,
      format: 'text',
      rawText,
    });
    expect(bookDoc.createdAt).toEqual({ __fakeServerTimestamp: true });

    const sections = sectionsForBook(store, result.bookId);
    expect(sections).toHaveLength(3);
    expect(sections[0]).toMatchObject({
      sectionNumber: 1,
      startWordIndex: 0,
      endWordIndex: 150,
      status: 'ready_to_practice',
      wordIds: [],
    });
    expect(sections[1]).toMatchObject({ sectionNumber: 2, status: 'locked' });
    expect(sections[2]).toMatchObject({ sectionNumber: 3, status: 'locked' });
  });

  test('a brand-new word is created with the deterministic id `${userId}_${word}` and SM-2 defaults', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockFetchDefinition.mockResolvedValue('the definition');

    const word = uniqueWord(0);
    const result = await addBook({
      title: 'Single Word Book',
      format: 'text',
      rawText: word,
      userId: 'user-1',
    });

    const doc = wordDoc(store, 'user-1', word) as any;
    expect(doc).toBeDefined();

    const today = new Date().toISOString().slice(0, 10);
    const sections = sectionsForBook(store, result.bookId);

    expect(doc).toMatchObject({
      userId: 'user-1',
      word,
      definition: 'the definition',
      repetitions: 0,
      easeFactor: 2.5,
      intervalDays: 1,
      nextReviewDate: today,
      lastRating: null,
    });
    expect(doc.sectionRefs).toEqual([{ bookId: result.bookId, sectionId: sections[0].id }]);
  });

  test('a brand-new word has its sectionRefs entry set at create() time, before the linking batch ever commits', async () => {
    const { db, store } = createFakeFirestore();

    // Gate the batch commit so we can inspect the store in the window
    // between create() resolving and the batch actually committing — the
    // exact window where a word doc could previously be observed with
    // sectionRefs: [] (indistinguishable from a reader-added word).
    let releaseBatch!: () => void;
    const batchGate = new Promise<void>((resolve) => {
      releaseBatch = resolve;
    });
    const originalBatch = db.batch.bind(db);
    db.batch = () => {
      const batch = originalBatch();
      const originalCommit = batch.commit.bind(batch);
      batch.commit = async () => {
        await batchGate;
        return originalCommit();
      };
      return batch;
    };

    mockGetFirestore.mockReturnValue(db);
    mockFetchDefinition.mockResolvedValue('a definition');

    const word = uniqueWord(0);
    const addBookPromise = addBook({
      title: 'Gated Batch Book',
      format: 'text',
      rawText: word,
      userId: 'user-1',
    });

    // Flush the microtask queue (all of addBook's work up to the gated
    // batch.commit() is pending promises, no real timers) without resolving
    // the gate, so execution is parked right at `await batch.commit()`.
    await new Promise((resolve) => setImmediate(resolve));

    const docBeforeBatch = wordDoc(store, 'user-1', word) as any;
    expect(docBeforeBatch).toBeDefined();
    expect(docBeforeBatch.sectionRefs).toHaveLength(1);
    expect(docBeforeBatch.sectionRefs[0]).toMatchObject({
      bookId: expect.any(String),
      sectionId: expect.any(String),
    });

    releaseBatch();
    const result = await addBookPromise;

    const sections = sectionsForBook(store, result.bookId);
    expect(docBeforeBatch.sectionRefs[0]).toEqual({
      bookId: result.bookId,
      sectionId: sections[0].id,
    });
  });

  test('an existing word (same deterministic id) is NOT overwritten — definition and SM-2 state survive re-extraction by a new book', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);

    const existingWord = uniqueWord(0);
    const newWord = uniqueWord(1);
    const existingWordId = `user-1_${existingWord}`;

    store.set(`words/${existingWordId}`, {
      userId: 'user-1',
      word: existingWord,
      definition: 'the original good definition',
      sectionRefs: [{ bookId: 'original-book-id', sectionId: 'original-section-id' }],
      repetitions: 3,
      easeFactor: 2.1,
      intervalDays: 10,
      nextReviewDate: '2020-01-01',
      lastRating: 'good',
    });

    // The dictionary lookup fails this time around; if the existing word
    // were re-created/overwritten, its good definition would be wiped out.
    mockFetchDefinition.mockImplementation((w: string) => {
      if (w === existingWord) {
        return Promise.reject(new Error('dictionary API down'));
      }
      return Promise.resolve(`definition for ${w}`);
    });

    const rawText = [existingWord, newWord].join(' ');

    const result = await addBook({
      title: 'Second Book',
      format: 'text',
      rawText,
      userId: 'user-1',
    });

    // fetchDefinition is never called for the already-existing word.
    expect(mockFetchDefinition).not.toHaveBeenCalledWith(existingWord);

    const existingDoc = wordDoc(store, 'user-1', existingWord) as any;
    expect(existingDoc).toMatchObject({
      definition: 'the original good definition',
      repetitions: 3,
      easeFactor: 2.1,
      intervalDays: 10,
      nextReviewDate: '2020-01-01',
      lastRating: 'good',
    });

    // Its sectionRefs gained the new section (Ruling 3: every word/section
    // pair is linked, even for pre-existing words) without losing the old one.
    const sections = sectionsForBook(store, result.bookId);
    expect(existingDoc.sectionRefs).toEqual([
      { bookId: 'original-book-id', sectionId: 'original-section-id' },
      { bookId: result.bookId, sectionId: sections[0].id },
    ]);

    // The new word was created normally.
    const newDoc = wordDoc(store, 'user-1', newWord) as any;
    expect(newDoc).toMatchObject({ definition: `definition for ${newWord}` });
  });

  test('two concurrent addBook calls creating the same new word result in exactly one document, and the losing call still gets a usable word id', async () => {
    const { db, store, createAttempts } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockFetchDefinition.mockResolvedValue('a definition');

    const sharedWord = uniqueWord(0);
    const wordId = `user-1_${sharedWord}`;

    const [resultA, resultB] = await Promise.all([
      addBook({ title: 'Book A', format: 'text', rawText: sharedWord, userId: 'user-1' }),
      addBook({ title: 'Book B', format: 'text', rawText: sharedWord, userId: 'user-1' }),
    ]);

    // Both callers genuinely raced for the same path: .create() was
    // attempted twice (proving addBook's catch-already-exists fallback,
    // not just two calls that happened to run sequentially), yet exactly
    // one word document survives.
    expect(createAttempts.get(`words/${wordId}`)).toBe(2);
    const wordKeys = Array.from(store.keys()).filter((k) => k === `words/${wordId}`);
    expect(wordKeys).toHaveLength(1);

    // Both callers still end up with a usable word id: each book's section
    // links the same wordId into its wordIds array, and the word's
    // sectionRefs contains both sections.
    const sectionsA = sectionsForBook(store, resultA.bookId);
    const sectionsB = sectionsForBook(store, resultB.bookId);
    expect((sectionsA[0] as any).wordIds).toContain(wordId);
    expect((sectionsB[0] as any).wordIds).toContain(wordId);

    const doc = wordDoc(store, 'user-1', sharedWord) as any;
    expect(doc.sectionRefs).toHaveLength(2);
    expect(doc.sectionRefs).toEqual(
      expect.arrayContaining([
        { bookId: resultA.bookId, sectionId: sectionsA[0].id },
        { bookId: resultB.bookId, sectionId: sectionsB[0].id },
      ])
    );
  });

  test('a dictionary lookup failure for one word does not abort extraction for the rest of the section', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);

    const words = Array.from({ length: 5 }, (_, i) => uniqueWord(i));
    const [word0, , word2] = words;
    const rawText = words.join(' ');

    mockFetchDefinition.mockImplementation((w: string) => {
      if (w === word2) {
        return Promise.reject(new Error('dictionary API down'));
      }
      return Promise.resolve(`definition for ${w}`);
    });

    await expect(
      addBook({ title: 'Flaky Dictionary Book', format: 'text', rawText, userId: 'user-1' })
    ).resolves.toMatchObject({});

    const failedDoc = wordDoc(store, 'user-1', word2) as any;
    expect(failedDoc).toBeDefined();
    expect(failedDoc.definition).toBeNull();

    const okDoc = wordDoc(store, 'user-1', word0) as any;
    expect(okDoc.definition).toBe(`definition for ${word0}`);
  });

  test("each word doc's sectionRefs and each section doc's wordIds are updated together for every word/section pair", async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockFetchDefinition.mockResolvedValue('a definition');

    const word0 = uniqueWord(0);
    const word1 = uniqueWord(1);

    // 150 "the"s with a unique word swapped into the first slot of each
    // section, so section 1 and section 2 each get exactly one candidate.
    const section1Words = [word0, ...Array.from({ length: 149 }, () => 'the')];
    const section2Words = [word1, ...Array.from({ length: 149 }, () => 'the')];
    const rawText = [...section1Words, ...section2Words].join(' ');

    const result = await addBook({
      title: 'Two Section Book',
      format: 'text',
      rawText,
      userId: 'user-1',
    });

    const sections = sectionsForBook(store, result.bookId);
    expect(sections).toHaveLength(2);

    const wordId0 = `user-1_${word0}`;
    const wordId1 = `user-1_${word1}`;

    expect((sections[0] as any).wordIds).toEqual([wordId0]);
    expect((sections[1] as any).wordIds).toEqual([wordId1]);

    const doc0 = wordDoc(store, 'user-1', word0) as any;
    const doc1 = wordDoc(store, 'user-1', word1) as any;
    expect(doc0.sectionRefs).toEqual([{ bookId: result.bookId, sectionId: sections[0].id }]);
    expect(doc1.sectionRefs).toEqual([{ bookId: result.bookId, sectionId: sections[1].id }]);
  });
});
