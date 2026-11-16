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

vi.mock('@/lib/text/detectLanguage', () => ({
  detectLanguage: vi.fn(() => 'english'),
}));

vi.mock('@/lib/text/detectChapters', () => ({
  detectChapterBreaksByHeading: vi.fn(() => null),
  detectChapterBreaksFromTitles: vi.fn(() => null),
}));

// A self-contained in-memory fake for the pending raw-text blob, keyed by
// `${userId}/${bookId}` — real enough that savePendingBookText -> finalize's
// readPendingBookText -> deletePendingBookText genuinely round-trip against
// each other within a test, including the "already deleted" case the
// idempotency guard depends on (a real readPendingBookText would throw on a
// missing blob, matching the real Storage-backed implementation).
vi.mock('@/lib/storage/pendingBookText', () => {
  const pendingStore = new Map<string, string>();
  return {
    __pendingStore: pendingStore,
    savePendingBookText: vi.fn(async (userId: string, bookId: string, text: string) => {
      pendingStore.set(`${userId}/${bookId}`, text);
    }),
    readPendingBookText: vi.fn(async (userId: string, bookId: string) => {
      const key = `${userId}/${bookId}`;
      if (!pendingStore.has(key)) {
        throw new Error(`No pending book text found for ${key}`);
      }
      return pendingStore.get(key)!;
    }),
    deletePendingBookText: vi.fn(async (userId: string, bookId: string) => {
      pendingStore.delete(`${userId}/${bookId}`);
    }),
  };
});

import { getFirestore } from 'firebase-admin/firestore';
import { fetchDefinition } from '@/lib/dictionary/dictionaryApi';
import { detectLanguage } from '@/lib/text/detectLanguage';
import { detectChapterBreaksByHeading, detectChapterBreaksFromTitles } from '@/lib/text/detectChapters';
import {
  savePendingBookText,
  readPendingBookText,
  deletePendingBookText,
} from '@/lib/storage/pendingBookText';
import { buildWordId } from '@/lib/firebase/wordId';
import { addBook, finalizeSectioning } from './bookService';

const mockGetFirestore = getFirestore as unknown as ReturnType<typeof vi.fn>;
const mockFetchDefinition = fetchDefinition as unknown as ReturnType<typeof vi.fn>;
const mockDetectLanguage = detectLanguage as unknown as ReturnType<typeof vi.fn>;
const mockDetectChapterBreaksByHeading = detectChapterBreaksByHeading as unknown as ReturnType<
  typeof vi.fn
>;
const mockDetectChapterBreaksFromTitles = detectChapterBreaksFromTitles as unknown as ReturnType<
  typeof vi.fn
>;
const mockSavePendingBookText = savePendingBookText as unknown as ReturnType<typeof vi.fn>;
const mockReadPendingBookText = readPendingBookText as unknown as ReturnType<typeof vi.fn>;
const mockDeletePendingBookText = deletePendingBookText as unknown as ReturnType<typeof vi.fn>;

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

  // Mutex-style fake for db.runTransaction: real Firestore transactions are
  // optimistic-concurrency + retry, but for this fake, serializing every
  // transaction callback's execution end-to-end (no two callback bodies ever
  // run with their statements interleaved) gives the same isolation
  // guarantee that matters here — the check-then-claim inside one
  // transaction is atomic with respect to any other concurrent transaction
  // against this same fake db. transactionAttempts counts how many times a
  // transaction body actually ran, so a test can assert two concurrent
  // callers each really entered runTransaction (not that one was skipped
  // entirely by some scheduling fluke).
  let lock: Promise<void> = Promise.resolve();
  let transactionAttempts = 0;

  async function runTransaction<T>(
    updateFunction: (tx: {
      get: (ref: { path: string }) => Promise<{
        exists: boolean;
        id: string;
        data: () => Record<string, unknown> | undefined;
      }>;
      update: (ref: { path: string }, data: Record<string, unknown>) => void;
    }) => Promise<T>
  ): Promise<T> {
    const previous = lock;
    let release!: () => void;
    lock = new Promise((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      transactionAttempts += 1;
      const tx = {
        async get(ref: { path: string }) {
          const data = store.get(ref.path);
          return {
            exists: data !== undefined,
            id: ref.path.split('/').pop()!,
            data: () => (data ? { ...data } : undefined),
          };
        },
        update(ref: { path: string }, data: Record<string, unknown>) {
          applyUpdate(ref.path, data);
        },
      };
      return await updateFunction(tx);
    } finally {
      release();
    }
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
    runTransaction,
  };

  return {
    db,
    store,
    createAttempts,
    get transactionAttempts() {
      return transactionAttempts;
    },
  };
}

function sectionsForBook(store: Map<string, StoredDoc>, bookId: string) {
  const prefix = `books/${bookId}/sections/`;
  return Array.from(store.entries())
    .filter(([path]) => path.startsWith(prefix))
    .map(([path, data]) => ({ id: path.slice(prefix.length), ...data }))
    .sort((a, b) => (a as any).sectionNumber - (b as any).sectionNumber);
}

function wordDoc(
  store: Map<string, StoredDoc>,
  userId: string,
  word: string,
  language: string = 'english'
) {
  return store.get(`words/${buildWordId(userId, language, word)}`);
}

beforeEach(() => {
  mockFetchDefinition.mockReset();
  mockFetchDefinition.mockResolvedValue('a definition');
  mockDetectLanguage.mockReset();
  mockDetectLanguage.mockReturnValue('english');
  mockDetectChapterBreaksByHeading.mockReset();
  mockDetectChapterBreaksByHeading.mockReturnValue(null);
  mockDetectChapterBreaksFromTitles.mockReset();
  mockDetectChapterBreaksFromTitles.mockReturnValue(null);
  mockSavePendingBookText.mockClear();
  mockReadPendingBookText.mockClear();
  mockDeletePendingBookText.mockClear();
});

describe('addBook', () => {
  test('addBook for an upload creates the book doc with sectioningMethod: null and no sections yet', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockDetectLanguage.mockReturnValue('german');
    mockDetectChapterBreaksByHeading.mockReturnValue([0, 42]);

    const { bookId } = await addBook({
      title: 'T',
      format: 'text',
      rawText: 'hello world',
      userId: 'u1',
    });

    const bookDoc = store.get(`books/${bookId}`) as any;
    expect(bookDoc).toMatchObject({
      userId: 'u1',
      title: 'T',
      author: null,
      format: 'text',
      source: 'uploaded',
      sectioningMethod: null,
      pagesPerSection: null,
      language: 'german',
      detectedChapterBreaks: [0, 42],
    });
    expect(bookDoc.createdAt).toEqual({ __fakeServerTimestamp: true });
    // Important #3: the book doc must NOT carry the whole book's flattened
    // text, now or ever — the text lives in the pending-text blob until
    // finalizeSectioning slices it into section documents.
    expect(bookDoc.rawText).toBeUndefined();

    expect(sectionsForBook(store, bookId)).toHaveLength(0);
    expect(mockSavePendingBookText).toHaveBeenCalledWith('u1', bookId, 'hello world');
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

    const { bookId } = await addBook({
      title: 'Flaky Dictionary Book',
      format: 'text',
      rawText,
      userId: 'user-1',
    });
    await finalizeSectioning({ bookId, userId: 'user-1', method: 'by_page', pagesPerSection: 1 });

    const failedDoc = wordDoc(store, 'user-1', word2) as any;
    expect(failedDoc).toBeDefined();
    expect(failedDoc.definition).toBeNull();

    const okDoc = wordDoc(store, 'user-1', word0) as any;
    expect(okDoc.definition).toBe(`definition for ${word0}`);
  });

  test('addBook stores language on the book doc; finalizeSectioning stores it on extracted words', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockFetchDefinition.mockResolvedValue('a definition');

    const word = uniqueWord(0);
    const { bookId } = await addBook({
      title: 'Language Book',
      format: 'text',
      rawText: word,
      userId: 'user-1',
    });

    const bookDoc = store.get(`books/${bookId}`) as any;
    expect(bookDoc).toMatchObject({ language: 'english', source: 'uploaded' });

    await finalizeSectioning({ bookId, userId: 'user-1', method: 'by_page', pagesPerSection: 1 });

    const expectedWordId = buildWordId('user-1', 'english', word);
    const wordKey = `words/${expectedWordId}`;
    expect(store.has(wordKey)).toBe(true);
    const doc = store.get(wordKey) as any;
    expect(doc).toMatchObject({ language: 'english' });
  });

  test('addBook keeps the same spelling separate across two languages for the same user', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockFetchDefinition.mockResolvedValue('a definition');

    // The brief's literal example word ("chat") is itself in
    // lib/text/commonWords.json, so extractVocabulary strips it out
    // regardless of language and no word doc would ever be created under
    // either language — that would test nothing. Use a word guaranteed not
    // to be in the (English-only, today) common-words list instead, while
    // keeping the brief's actual intent: same spelling, two languages, same
    // user, two distinct word docs.
    const sharedSpelling = uniqueWord(0);

    mockDetectLanguage.mockReturnValueOnce('english').mockReturnValueOnce('french');

    const bookA = await addBook({
      title: 'A',
      format: 'text',
      rawText: `${sharedSpelling} ${sharedSpelling} ${sharedSpelling}`,
      userId: 'u1',
    });
    const bookB = await addBook({
      title: 'B',
      format: 'text',
      rawText: `${sharedSpelling} ${sharedSpelling} ${sharedSpelling}`,
      userId: 'u1',
    });

    await finalizeSectioning({
      bookId: bookA.bookId,
      userId: 'u1',
      method: 'by_page',
      pagesPerSection: 1,
    });
    await finalizeSectioning({
      bookId: bookB.bookId,
      userId: 'u1',
      method: 'by_page',
      pagesPerSection: 1,
    });

    const englishWordId = buildWordId('u1', 'english', sharedSpelling);
    const frenchWordId = buildWordId('u1', 'french', sharedSpelling);
    expect(store.has(`words/${englishWordId}`)).toBe(true);
    expect(store.has(`words/${frenchWordId}`)).toBe(true);
  });
});

describe('finalizeSectioning', () => {
  test('with method by_page creates sections (page-chunked) and words, deleting the pending blob afterward', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);

    // 320 common words -> extractVocabulary yields no candidate words, so
    // this test only asserts book/section document shape. With pagesPerSection
    // 1 and the default WORDS_PER_PAGE (250), 320 words split into a
    // 250-word section and a 70-word remainder.
    const rawText = Array.from({ length: 320 }, () => 'the').join(' ');

    const { bookId } = await addBook({
      title: 'Page Chunked Book',
      format: 'text',
      rawText,
      userId: 'user-1',
    });

    await finalizeSectioning({ bookId, userId: 'user-1', method: 'by_page', pagesPerSection: 1 });

    const words = rawText.split(' ');
    const sections = sectionsForBook(store, bookId);
    expect(sections).toHaveLength(2);
    expect(sections[0]).toMatchObject({
      sectionNumber: 1,
      startWordIndex: 0,
      endWordIndex: 250,
      text: words.slice(0, 250).join(' '),
      status: 'ready_to_practice',
      wordIds: [],
    });
    expect(sections[1]).toMatchObject({
      sectionNumber: 2,
      startWordIndex: 250,
      endWordIndex: 320,
      status: 'locked',
      text: words.slice(250, 320).join(' '),
    });

    // The pending text was read, then deleted, once sectioning succeeded.
    expect(mockReadPendingBookText).toHaveBeenCalledWith('user-1', bookId);
    expect(mockDeletePendingBookText).toHaveBeenCalledWith('user-1', bookId);

    const bookDoc = store.get(`books/${bookId}`) as any;
    expect(bookDoc).toMatchObject({ sectioningMethod: 'by_page', pagesPerSection: 1 });
  });

  test('with method by_chapter uses the stored detectedChapterBreaks', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockFetchDefinition.mockResolvedValue('a definition');

    const word0 = uniqueWord(0);
    const word1 = uniqueWord(1);
    const rawText = [word0, word1].join(' ');
    mockDetectChapterBreaksByHeading.mockReturnValue([0, 1]);

    const { bookId } = await addBook({
      title: 'Chaptered Book',
      format: 'text',
      rawText,
      userId: 'user-1',
    });

    const bookDoc = store.get(`books/${bookId}`) as any;
    expect(bookDoc.detectedChapterBreaks).toEqual([0, 1]);

    await finalizeSectioning({ bookId, userId: 'user-1', method: 'by_chapter' });

    const sections = sectionsForBook(store, bookId);
    expect(sections).toHaveLength(2);
    expect(sections[0]).toMatchObject({
      sectionNumber: 1,
      startWordIndex: 0,
      endWordIndex: 1,
      text: word0,
      status: 'ready_to_practice',
    });
    expect(sections[1]).toMatchObject({
      sectionNumber: 2,
      startWordIndex: 1,
      endWordIndex: 2,
      text: word1,
      status: 'locked',
    });

    const updatedBookDoc = store.get(`books/${bookId}`) as any;
    expect(updatedBookDoc.sectioningMethod).toBe('by_chapter');
    expect(updatedBookDoc.pagesPerSection).toBeNull();
  });

  test('prefers detectChapterBreaksFromTitles over the heading scan when chapterTitles are supplied', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockDetectChapterBreaksFromTitles.mockReturnValue([0, 3]);
    // If this were used instead, the assertions below would catch it.
    mockDetectChapterBreaksByHeading.mockReturnValue([0, 7]);

    const rawText = Array.from({ length: 6 }, () => 'the').join(' ');

    const { bookId } = await addBook({
      title: 'Outline Book',
      format: 'epub',
      rawText,
      userId: 'user-1',
      chapterTitles: ['Chapter One', 'Chapter Two'],
    });

    expect(mockDetectChapterBreaksFromTitles).toHaveBeenCalledWith(rawText, [
      'Chapter One',
      'Chapter Two',
    ]);
    const bookDoc = store.get(`books/${bookId}`) as any;
    expect(bookDoc.detectedChapterBreaks).toEqual([0, 3]);
  });

  test('a brand-new word is created with the deterministic id `${userId}_${language}_${word}` and SM-2 defaults', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockFetchDefinition.mockResolvedValue('the definition');

    const word = uniqueWord(0);
    const { bookId } = await addBook({
      title: 'Single Word Book',
      format: 'text',
      rawText: word,
      userId: 'user-1',
    });
    await finalizeSectioning({ bookId, userId: 'user-1', method: 'by_page', pagesPerSection: 1 });

    const doc = wordDoc(store, 'user-1', word) as any;
    expect(doc).toBeDefined();

    const today = new Date().toISOString().slice(0, 10);
    const sections = sectionsForBook(store, bookId);

    expect(doc).toMatchObject({
      userId: 'user-1',
      word,
      definition: 'the definition',
      repetitions: 0,
      easeFactor: 2.5,
      intervalDays: 1,
      nextReviewDate: today,
      lastRating: null,
      // Important #2 regression fix: extraction-time words are never
      // "reader-added", and this flag must be set at creation (not left
      // undefined) since it's the only immutable signal /review relies on.
      addedFromReader: false,
    });
    expect(doc.sectionRefs).toEqual([{ bookId, sectionId: sections[0].id }]);
  });

  // Important #3: the dictionary API (dictionaryapi.dev) is English-only. For
  // a non-English book, a candidate word that happens to look like an
  // English word (e.g. Spanish "sale", French "once") can get back a REAL
  // but WRONG English definition instead of failing gracefully to null.
  // Combined with the "never overwrite an existing word's definition" rule,
  // a wrong definition becomes permanent. New words extracted from a
  // non-English book must skip fetchDefinition entirely and store
  // definition: null, leaving the null-backfill path (lookup route, or a
  // future translation pipeline) as the only way to ever fill it in.
  test('a non-English book stores definition: null for new words and never calls fetchDefinition', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockDetectLanguage.mockReturnValue('spanish');

    const word = uniqueWord(0);
    const { bookId } = await addBook({
      title: 'Spanish Book',
      format: 'text',
      rawText: word,
      userId: 'user-1',
    });
    await finalizeSectioning({ bookId, userId: 'user-1', method: 'by_page', pagesPerSection: 1 });

    expect(mockFetchDefinition).not.toHaveBeenCalled();

    const doc = wordDoc(store, 'user-1', word, 'spanish') as any;
    expect(doc).toBeDefined();
    expect(doc.definition).toBeNull();
  });

  // Contrast case: an English book still calls the dictionary API normally.
  test('an English book still calls fetchDefinition for new words', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockDetectLanguage.mockReturnValue('english');
    mockFetchDefinition.mockResolvedValue('an english definition');

    const word = uniqueWord(0);
    const { bookId } = await addBook({
      title: 'English Book',
      format: 'text',
      rawText: word,
      userId: 'user-1',
    });
    await finalizeSectioning({ bookId, userId: 'user-1', method: 'by_page', pagesPerSection: 1 });

    expect(mockFetchDefinition).toHaveBeenCalledWith(word);

    const doc = wordDoc(store, 'user-1', word, 'english') as any;
    expect(doc.definition).toBe('an english definition');
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
    const { bookId } = await addBook({
      title: 'Gated Batch Book',
      format: 'text',
      rawText: word,
      userId: 'user-1',
    });

    const finalizePromise = finalizeSectioning({
      bookId,
      userId: 'user-1',
      method: 'by_page',
      pagesPerSection: 1,
    });

    // Flush the microtask queue (all of finalizeSectioning's work up to the
    // gated batch.commit() is pending promises, no real timers) without
    // resolving the gate, so execution is parked right at `await
    // batch.commit()`.
    await new Promise((resolve) => setImmediate(resolve));

    const docBeforeBatch = wordDoc(store, 'user-1', word) as any;
    expect(docBeforeBatch).toBeDefined();
    expect(docBeforeBatch.sectionRefs).toHaveLength(1);
    expect(docBeforeBatch.sectionRefs[0]).toMatchObject({
      bookId: expect.any(String),
      sectionId: expect.any(String),
    });

    releaseBatch();
    await finalizePromise;

    const sections = sectionsForBook(store, bookId);
    expect(docBeforeBatch.sectionRefs[0]).toEqual({
      bookId,
      sectionId: sections[0].id,
    });
  });

  test('an existing word (same deterministic id) is NOT overwritten — definition and SM-2 state survive re-extraction by a new book', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);

    const existingWord = uniqueWord(0);
    const newWord = uniqueWord(1);
    const existingWordId = buildWordId('user-1', 'english', existingWord);

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

    const { bookId } = await addBook({
      title: 'Second Book',
      format: 'text',
      rawText,
      userId: 'user-1',
    });
    await finalizeSectioning({ bookId, userId: 'user-1', method: 'by_page', pagesPerSection: 1 });

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
    const sections = sectionsForBook(store, bookId);
    expect(existingDoc.sectionRefs).toEqual([
      { bookId: 'original-book-id', sectionId: 'original-section-id' },
      { bookId, sectionId: sections[0].id },
    ]);

    // The new word was created normally.
    const newDoc = wordDoc(store, 'user-1', newWord) as any;
    expect(newDoc).toMatchObject({ definition: `definition for ${newWord}` });
  });

  test('Important #2 regression: re-extracting a reader-added word grows its sectionRefs but never touches addedFromReader', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockFetchDefinition.mockResolvedValue('a definition');

    // Simulates a word originally created via the reader's "Add to my
    // vocabulary" button (app/api/words/lookup/route.ts): addedFromReader
    // true, sectionRefs empty.
    const readerWord = uniqueWord(0);
    store.set(`words/${buildWordId('user-1', 'english', readerWord)}`, {
      userId: 'user-1',
      word: readerWord,
      definition: 'reader-added definition',
      sectionRefs: [],
      repetitions: 0,
      easeFactor: 2.5,
      intervalDays: 1,
      nextReviewDate: '2026-01-01',
      lastRating: null,
      addedFromReader: true,
    });

    const { bookId } = await addBook({
      title: 'Later Book',
      format: 'text',
      rawText: readerWord,
      userId: 'user-1',
    });
    await finalizeSectioning({ bookId, userId: 'user-1', method: 'by_page', pagesPerSection: 1 });

    // sectionRefs legitimately grows (existing addBook/finalizeSectioning
    // behavior) ...
    const doc = wordDoc(store, 'user-1', readerWord) as any;
    const sections = sectionsForBook(store, bookId);
    expect(doc.sectionRefs).toEqual([{ bookId, sectionId: sections[0].id }]);

    // ... but addedFromReader must survive untouched, since it's the
    // immutable signal /review relies on — not sectionRefs.
    expect(doc.addedFromReader).toBe(true);
  });

  test('two concurrent finalizeSectioning calls creating the same new word result in exactly one document, and the losing call still gets a usable word id', async () => {
    const { db, store, createAttempts } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockFetchDefinition.mockResolvedValue('a definition');

    const sharedWord = uniqueWord(0);
    const wordId = buildWordId('user-1', 'english', sharedWord);

    const bookA = await addBook({
      title: 'Book A',
      format: 'text',
      rawText: sharedWord,
      userId: 'user-1',
    });
    const bookB = await addBook({
      title: 'Book B',
      format: 'text',
      rawText: sharedWord,
      userId: 'user-1',
    });

    await Promise.all([
      finalizeSectioning({
        bookId: bookA.bookId,
        userId: 'user-1',
        method: 'by_page',
        pagesPerSection: 1,
      }),
      finalizeSectioning({
        bookId: bookB.bookId,
        userId: 'user-1',
        method: 'by_page',
        pagesPerSection: 1,
      }),
    ]);

    // Both callers genuinely raced for the same path: .create() was
    // attempted twice (proving extractAndLinkWords's catch-already-exists
    // fallback, not just two calls that happened to run sequentially), yet
    // exactly one word document survives.
    expect(createAttempts.get(`words/${wordId}`)).toBe(2);
    const wordKeys = Array.from(store.keys()).filter((k) => k === `words/${wordId}`);
    expect(wordKeys).toHaveLength(1);

    // Both callers still end up with a usable word id: each book's section
    // links the same wordId into its wordIds array, and the word's
    // sectionRefs contains both sections.
    const sectionsA = sectionsForBook(store, bookA.bookId);
    const sectionsB = sectionsForBook(store, bookB.bookId);
    expect((sectionsA[0] as any).wordIds).toContain(wordId);
    expect((sectionsB[0] as any).wordIds).toContain(wordId);

    const doc = wordDoc(store, 'user-1', sharedWord) as any;
    expect(doc.sectionRefs).toHaveLength(2);
    expect(doc.sectionRefs).toEqual(
      expect.arrayContaining([
        { bookId: bookA.bookId, sectionId: sectionsA[0].id },
        { bookId: bookB.bookId, sectionId: sectionsB[0].id },
      ])
    );
  });

  test("each word doc's sectionRefs and each section doc's wordIds are updated together for every word/section pair", async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockFetchDefinition.mockResolvedValue('a definition');

    const word0 = uniqueWord(0);
    const word1 = uniqueWord(1);

    // Two 250-word page-chunks (the default WORDS_PER_PAGE with
    // pagesPerSection: 1) with a unique word swapped into the first slot of
    // each, so section 1 and section 2 each get exactly one candidate.
    const section1Words = [word0, ...Array.from({ length: 249 }, () => 'the')];
    const section2Words = [word1, ...Array.from({ length: 249 }, () => 'the')];
    const rawText = [...section1Words, ...section2Words].join(' ');

    const { bookId } = await addBook({
      title: 'Two Section Book',
      format: 'text',
      rawText,
      userId: 'user-1',
    });
    await finalizeSectioning({ bookId, userId: 'user-1', method: 'by_page', pagesPerSection: 1 });

    const sections = sectionsForBook(store, bookId);
    expect(sections).toHaveLength(2);

    const wordId0 = buildWordId('user-1', 'english', word0);
    const wordId1 = buildWordId('user-1', 'english', word1);

    expect((sections[0] as any).wordIds).toEqual([wordId0]);
    expect((sections[1] as any).wordIds).toEqual([wordId1]);

    const doc0 = wordDoc(store, 'user-1', word0) as any;
    const doc1 = wordDoc(store, 'user-1', word1) as any;
    expect(doc0.sectionRefs).toEqual([{ bookId, sectionId: sections[0].id }]);
    expect(doc1.sectionRefs).toEqual([{ bookId, sectionId: sections[1].id }]);
  });

  // BINDING RULING (plan preflight conflict scan, Review Focus #5): a
  // second, accidental call to finalizeSectioning on an already-finalized
  // book must be a safe no-op — it must not throw (readPendingBookText
  // would reject against the already-deleted blob) and must not re-run
  // extraction/create duplicate sections.
  test('a second finalizeSectioning call on an already-finalized book does not throw, re-read the pending blob, or duplicate sections', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockFetchDefinition.mockResolvedValue('a definition');

    const word = uniqueWord(0);
    const { bookId } = await addBook({
      title: 'Finalize Twice Book',
      format: 'text',
      rawText: word,
      userId: 'user-1',
    });

    await finalizeSectioning({ bookId, userId: 'user-1', method: 'by_page', pagesPerSection: 1 });

    const sectionsAfterFirst = sectionsForBook(store, bookId);
    expect(sectionsAfterFirst.length).toBeGreaterThan(0);
    const readCallCountAfterFirst = mockReadPendingBookText.mock.calls.length;
    expect(readCallCountAfterFirst).toBe(1);

    // The pending blob is really gone now — a naive second call that didn't
    // guard against this would hit readPendingBookText's real rejection.
    await expect(
      finalizeSectioning({ bookId, userId: 'user-1', method: 'by_page', pagesPerSection: 1 })
    ).resolves.toBeUndefined();

    // readPendingBookText was NOT called again — the guard returns before
    // ever attempting to re-read the (already-deleted) blob.
    expect(mockReadPendingBookText.mock.calls.length).toBe(readCallCountAfterFirst);

    // No duplicate sections were created.
    const sectionsAfterSecond = sectionsForBook(store, bookId);
    expect(sectionsAfterSecond).toEqual(sectionsAfterFirst);
  });

  // Important #2 (race fix): the above guard only protects a second call
  // made strictly AFTER a first call has fully finished — it does nothing
  // for two genuinely concurrent calls, since both could read
  // sectioningMethod: null before either finishes writing. The fix claims
  // sectioningMethod atomically inside a transaction, BEFORE any slow work
  // (reading the pending blob, extracting words) — so the loser of the race
  // sees it already set and returns early without ever touching the pending
  // blob a second time.
  test('two concurrent finalizeSectioning calls for the SAME book create exactly one set of sections, and only one of them reads the pending blob', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockFetchDefinition.mockResolvedValue('a definition');

    const word = uniqueWord(0);
    const { bookId } = await addBook({
      title: 'Racing Finalize Book',
      format: 'text',
      rawText: word,
      userId: 'user-1',
    });

    const [resultA, resultB] = await Promise.all([
      finalizeSectioning({ bookId, userId: 'user-1', method: 'by_page', pagesPerSection: 1 }),
      finalizeSectioning({ bookId, userId: 'user-1', method: 'by_page', pagesPerSection: 1 }),
    ]);

    // Both calls resolve without throwing.
    expect(resultA).toBeUndefined();
    expect(resultB).toBeUndefined();

    // Exactly one set of sections exists — the race did not double them up.
    const sections = sectionsForBook(store, bookId);
    expect(sections).toHaveLength(1);

    // The book ends up finalized exactly once, with the expected method.
    const bookDoc = store.get(`books/${bookId}`) as any;
    expect(bookDoc.sectioningMethod).toBe('by_page');
    expect(bookDoc.pagesPerSection).toBe(1);

    // Only the winning call ever read the (slow, one-shot) pending blob —
    // the loser's transaction saw sectioningMethod already claimed and
    // returned before reaching readPendingBookText at all.
    expect(mockReadPendingBookText).toHaveBeenCalledTimes(1);
  });
});
