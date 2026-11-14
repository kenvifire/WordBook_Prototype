import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({ getAdminApp: vi.fn(() => ({})) }));

import { getFirestore } from 'firebase-admin/firestore';
import { computeRecognitionRate, maybeUnlockNextSection } from './sectionService';

const mockGetFirestore = getFirestore as unknown as ReturnType<typeof vi.fn>;

type StoredDoc = Record<string, unknown>;

// A minimal fake Firestore, backed by an in-memory Map keyed by full
// document path, supporting exactly the operations maybeUnlockNextSection
// needs: doc get/update, and a single-field equality `.where(...).limit(1)`
// query over a collection's direct children — mirroring the fake-store style
// already used in lib/books/bookService.test.ts rather than a chain-mocking
// stub, since this function reads one section, several word docs, and
// queries for a sibling section, all from the same underlying store.
function createFakeFirestore() {
  const store = new Map<string, StoredDoc>();

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
      async update(data: Record<string, unknown>) {
        const existing = store.get(path);
        if (!existing) {
          throw new Error(`No document to update at ${path}`);
        }
        store.set(path, { ...existing, ...data });
      },
      collection(name: string) {
        return makeCollectionRef(`${path}/${name}`);
      },
    };
  }

  function directChildren(collectionPath: string): [string, StoredDoc][] {
    const prefix = `${collectionPath}/`;
    return Array.from(store.entries()).filter(
      ([path]) => path.startsWith(prefix) && !path.slice(prefix.length).includes('/')
    );
  }

  function makeQuery(collectionPath: string, filters: { field: string; value: unknown }[], limitN?: number) {
    return {
      where(field: string, _op: '==', value: unknown) {
        return makeQuery(collectionPath, [...filters, { field, value }], limitN);
      },
      limit(n: number) {
        return makeQuery(collectionPath, filters, n);
      },
      async get() {
        let matches = directChildren(collectionPath).filter(([, data]) =>
          filters.every((f) => data[f.field] === f.value)
        );
        if (limitN !== undefined) {
          matches = matches.slice(0, limitN);
        }
        const docs = matches.map(([path, data]) => ({
          ref: makeDocRef(path),
          data: () => ({ ...data }),
        }));
        return { empty: docs.length === 0, docs };
      },
    };
  }

  function makeCollectionRef(path: string): any {
    return {
      path,
      doc(id: string) {
        return makeDocRef(`${path}/${id}`);
      },
      where(field: string, op: '==', value: unknown) {
        return makeQuery(path, [{ field, value }]);
      },
    };
  }

  const db = {
    collection(name: string) {
      return makeCollectionRef(name);
    },
  };

  return { db, store };
}

function putSection(
  store: Map<string, StoredDoc>,
  bookId: string,
  sectionId: string,
  data: StoredDoc
) {
  store.set(`books/${bookId}/sections/${sectionId}`, { ...data });
}

function putWord(store: Map<string, StoredDoc>, wordId: string, data: StoredDoc) {
  store.set(`words/${wordId}`, { ...data });
}

function getSection(store: Map<string, StoredDoc>, bookId: string, sectionId: string) {
  return store.get(`books/${bookId}/sections/${sectionId}`) as any;
}

beforeEach(() => {
  mockGetFirestore.mockReset();
});

describe('computeRecognitionRate', () => {
  test('rate is the fraction of words last rated good or easy', () => {
    const words = [
      { lastRating: 'good' },
      { lastRating: 'easy' },
      { lastRating: 'again' },
      { lastRating: null },
    ];
    expect(computeRecognitionRate(words)).toBe(0.5);
  });

  test('a section with zero words auto-passes at 1.0', () => {
    expect(computeRecognitionRate([])).toBe(1);
  });

  test('79% does not meet the 80% threshold, 80% exactly does', () => {
    const near = Array.from({ length: 100 }, (_, i) => ({ lastRating: i < 79 ? 'good' : 'again' }));
    expect(computeRecognitionRate(near) >= 0.8).toBe(false);
    const exact = Array.from({ length: 100 }, (_, i) => ({ lastRating: i < 80 ? 'good' : 'again' }));
    expect(computeRecognitionRate(exact) >= 0.8).toBe(true);
  });
});

describe('maybeUnlockNextSection', () => {
  test('unlocks reading for this section and practice for the next when the rate crosses 80%', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);

    putSection(store, 'book-1', 'section-1', {
      sectionNumber: 1,
      status: 'ready_to_practice',
      wordIds: ['w1', 'w2', 'w3', 'w4', 'w5'],
    });
    putSection(store, 'book-1', 'section-2', { sectionNumber: 2, status: 'locked', wordIds: [] });
    putWord(store, 'w1', { lastRating: 'good' });
    putWord(store, 'w2', { lastRating: 'good' });
    putWord(store, 'w3', { lastRating: 'good' });
    putWord(store, 'w4', { lastRating: 'easy' });
    putWord(store, 'w5', { lastRating: 'again' });

    await maybeUnlockNextSection('book-1', 'section-1');

    expect(getSection(store, 'book-1', 'section-1').status).toBe('ready_to_read');
    expect(getSection(store, 'book-1', 'section-2').status).toBe('ready_to_practice');
  });

  test('does nothing when the rate is below 80%', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);

    putSection(store, 'book-1', 'section-1', {
      sectionNumber: 1,
      status: 'ready_to_practice',
      wordIds: ['w1', 'w2', 'w3', 'w4', 'w5'],
    });
    putSection(store, 'book-1', 'section-2', { sectionNumber: 2, status: 'locked', wordIds: [] });
    putWord(store, 'w1', { lastRating: 'good' });
    putWord(store, 'w2', { lastRating: 'good' });
    putWord(store, 'w3', { lastRating: 'again' });
    putWord(store, 'w4', { lastRating: 'again' });
    putWord(store, 'w5', { lastRating: 'again' });

    await maybeUnlockNextSection('book-1', 'section-1');

    expect(getSection(store, 'book-1', 'section-1').status).toBe('ready_to_practice');
    expect(getSection(store, 'book-1', 'section-2').status).toBe('locked');
  });

  // I1: a `locked` section hasn't been reached by the learner yet, so it
  // must never jump straight to `ready_to_read` just because its words
  // happen to already be >=80% recognized globally (e.g. mastered via
  // another book). Only a section whose CURRENT status is exactly
  // `ready_to_practice` is eligible to advance.
  test('I1: does nothing when the target section is locked (never advances locked -> ready_to_read)', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);

    putSection(store, 'book-1', 'section-1', {
      sectionNumber: 1,
      status: 'locked',
      wordIds: ['w1', 'w2'],
    });
    putSection(store, 'book-1', 'section-2', { sectionNumber: 2, status: 'locked', wordIds: [] });
    // Both words already mastered globally -> rate would be 100% if
    // computed, but section-1 is locked and must not advance.
    putWord(store, 'w1', { lastRating: 'good' });
    putWord(store, 'w2', { lastRating: 'easy' });

    await maybeUnlockNextSection('book-1', 'section-1');

    expect(getSection(store, 'book-1', 'section-1').status).toBe('locked');
    expect(getSection(store, 'book-1', 'section-2').status).toBe('locked');
  });

  test('a zero-wordIds section auto-passes at rate 1.0 and still unlocks (C1 path)', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);

    putSection(store, 'book-1', 'section-1', {
      sectionNumber: 1,
      status: 'ready_to_practice',
      wordIds: [],
    });
    putSection(store, 'book-1', 'section-2', { sectionNumber: 2, status: 'locked', wordIds: [] });

    await maybeUnlockNextSection('book-1', 'section-1');

    expect(getSection(store, 'book-1', 'section-1').status).toBe('ready_to_read');
    expect(getSection(store, 'book-1', 'section-2').status).toBe('ready_to_practice');
  });

  test('does not relock or re-unlock a section already past ready_to_read/completed', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);

    putSection(store, 'book-1', 'section-1', {
      sectionNumber: 1,
      status: 'ready_to_read',
      wordIds: ['w1', 'w2'],
    });
    putSection(store, 'book-1', 'section-2', {
      sectionNumber: 2,
      status: 'ready_to_practice',
      wordIds: [],
    });
    putWord(store, 'w1', { lastRating: 'good' });
    putWord(store, 'w2', { lastRating: 'easy' });

    await maybeUnlockNextSection('book-1', 'section-1');

    // Status untouched for both — the guard returns before any read of the
    // words or the next section even happens.
    expect(getSection(store, 'book-1', 'section-1').status).toBe('ready_to_read');
    expect(getSection(store, 'book-1', 'section-2').status).toBe('ready_to_practice');

    // Also verify the already-`completed` case is left alone the same way.
    putSection(store, 'book-1', 'section-3', {
      sectionNumber: 3,
      status: 'completed',
      wordIds: ['w1'],
    });
    putSection(store, 'book-1', 'section-4', { sectionNumber: 4, status: 'locked', wordIds: [] });

    await maybeUnlockNextSection('book-1', 'section-3');

    expect(getSection(store, 'book-1', 'section-3').status).toBe('completed');
    expect(getSection(store, 'book-1', 'section-4').status).toBe('locked');
  });

  test('does not touch the next section when there is no next section', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);

    putSection(store, 'book-1', 'section-1', {
      sectionNumber: 1,
      status: 'ready_to_practice',
      wordIds: ['w1'],
    });
    putWord(store, 'w1', { lastRating: 'good' });

    await expect(maybeUnlockNextSection('book-1', 'section-1')).resolves.toBeUndefined();

    expect(getSection(store, 'book-1', 'section-1').status).toBe('ready_to_read');
  });
});
