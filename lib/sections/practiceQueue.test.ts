import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({ getAdminApp: vi.fn(() => ({})) }));

import { getFirestore } from 'firebase-admin/firestore';
import { getPracticeQueueForBook } from './practiceQueue';

const mockGetFirestore = getFirestore as unknown as ReturnType<typeof vi.fn>;

type StoredDoc = Record<string, unknown>;

// A minimal fake Firestore, backed by an in-memory Map keyed by full
// document path, mirroring the fake-store style already used in
// lib/sections/sectionService.test.ts / lib/books/bookService.test.ts rather
// than a chain-mocking stub. Extends that style with `<=` support on `where`
// and a basic `orderBy`, since this function's two queries need both (a
// status-equality + sectionNumber ordering query on a book's sections
// subcollection, and a userId-equality + nextReviewDate-range query on the
// top-level words collection).
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

  function allDocsOf(collectionPath: string): [string, StoredDoc][] {
    // The `words` collection is top-level, so its "children" ARE its
    // direct entries (no nesting to exclude) — reuse directChildren, which
    // already does exactly that.
    return directChildren(collectionPath);
  }

  function matchesFilter(data: StoredDoc, filter: { field: string; op: string; value: unknown }): boolean {
    const actual = data[filter.field];
    if (filter.op === '==') return actual === filter.value;
    if (filter.op === '<=') return (actual as string) <= (filter.value as string);
    throw new Error(`Unsupported op in fake Firestore: ${filter.op}`);
  }

  function makeQuery(
    collectionPath: string,
    filters: { field: string; op: string; value: unknown }[],
    order?: { field: string; direction: 'asc' | 'desc' },
    limitN?: number
  ) {
    return {
      where(field: string, op: string, value: unknown) {
        return makeQuery(collectionPath, [...filters, { field, op, value }], order, limitN);
      },
      orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
        return makeQuery(collectionPath, filters, { field, direction }, limitN);
      },
      limit(n: number) {
        return makeQuery(collectionPath, filters, order, n);
      },
      async get() {
        let matches = allDocsOf(collectionPath).filter(([, data]) =>
          filters.every((f) => matchesFilter(data, f))
        );
        if (order) {
          matches = matches.slice().sort(([, a], [, b]) => {
            const av = a[order.field] as number | string;
            const bv = b[order.field] as number | string;
            const cmp = av < bv ? -1 : av > bv ? 1 : 0;
            return order.direction === 'asc' ? cmp : -cmp;
          });
        }
        if (limitN !== undefined) {
          matches = matches.slice(0, limitN);
        }
        const docs = matches.map(([path, data]) => ({
          ref: makeDocRef(path),
          id: path.split('/').pop()!,
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
      where(field: string, op: string, value: unknown) {
        return makeQuery(path, [{ field, op, value }]);
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

beforeEach(() => {
  mockGetFirestore.mockReset();
});

describe('getPracticeQueueForBook', () => {
  test('includes every word of the next ready_to_practice section regardless of due date', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);

    putSection(store, 'book-1', 'section-1', {
      sectionNumber: 1,
      status: 'ready_to_practice',
      wordIds: ['w1', 'w2', 'w3'],
    });
    putWord(store, 'w1', {
      userId: 'u1',
      word: 'alpha',
      definition: 'def-a',
      lastRating: null,
      nextReviewDate: '2026-01-01',
      sectionRefs: [{ bookId: 'book-1', sectionId: 'section-1' }],
    });
    putWord(store, 'w2', {
      userId: 'u1',
      word: 'beta',
      definition: 'def-b',
      lastRating: 'good',
      // Far in the future — would never show up on a due-date-filtered
      // query, but this is the unlocking section's own word, so it must
      // appear regardless (sharp edge #1).
      nextReviewDate: '2099-01-01',
      sectionRefs: [{ bookId: 'book-1', sectionId: 'section-1' }],
    });
    putWord(store, 'w3', {
      userId: 'u1',
      word: 'gamma',
      definition: 'def-c',
      lastRating: null,
      nextReviewDate: '2026-01-01',
      sectionRefs: [{ bookId: 'book-1', sectionId: 'section-1' }],
    });

    const result = await getPracticeQueueForBook('u1', 'book-1');

    expect(result.map((w) => w.id).sort()).toEqual(['w1', 'w2', 'w3']);
  });

  test('includes due, previously-rated words linked to this book even from already-unlocked sections', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);

    // No ready_to_practice section at all for this book.
    putSection(store, 'book-1', 'section-1', {
      sectionNumber: 1,
      status: 'ready_to_read',
      wordIds: ['w1'],
    });

    putWord(store, 'w1', {
      userId: 'u1',
      word: 'due-word',
      definition: 'def-due',
      lastRating: 'good',
      nextReviewDate: '2020-01-01', // well in the past -> due
      sectionRefs: [{ bookId: 'book-1', sectionId: 'section-1' }],
    });
    putWord(store, 'w2', {
      userId: 'u1',
      word: 'not-due-word',
      definition: 'def-not-due',
      lastRating: 'good',
      nextReviewDate: '2099-01-01', // in the future -> not due
      sectionRefs: [{ bookId: 'book-1', sectionId: 'section-1' }],
    });

    const result = await getPracticeQueueForBook('u1', 'book-1');

    expect(result.map((w) => w.id)).toEqual(['w1']);
  });

  test('de-duplicates a word that is both due and part of the unlocking section', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);

    putSection(store, 'book-1', 'section-1', {
      sectionNumber: 1,
      status: 'ready_to_practice',
      wordIds: ['w1'],
    });

    putWord(store, 'w1', {
      userId: 'u1',
      word: 'both',
      definition: 'def-both',
      lastRating: 'good',
      nextReviewDate: '2020-01-01', // due AND part of the unlocking section
      sectionRefs: [{ bookId: 'book-1', sectionId: 'section-1' }],
    });

    const result = await getPracticeQueueForBook('u1', 'book-1');

    expect(result.map((w) => w.id)).toEqual(['w1']);
  });

  test('returns an empty array when the book has no unlocking section and nothing is due', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);

    putSection(store, 'book-1', 'section-1', {
      sectionNumber: 1,
      status: 'ready_to_read',
      wordIds: ['w1'],
    });
    putWord(store, 'w1', {
      userId: 'u1',
      word: 'future-word',
      definition: 'def-future',
      lastRating: 'good',
      nextReviewDate: '2099-01-01',
      sectionRefs: [{ bookId: 'book-1', sectionId: 'section-1' }],
    });

    const result = await getPracticeQueueForBook('u1', 'book-1');

    expect(result).toEqual([]);
  });

  test('excludes due words that belong to a different book even if the user owns both', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);

    putWord(store, 'w1', {
      userId: 'u1',
      word: 'other-book-word',
      definition: 'def-other',
      lastRating: 'good',
      nextReviewDate: '2020-01-01',
      sectionRefs: [{ bookId: 'book-2', sectionId: 'section-9' }],
    });

    const result = await getPracticeQueueForBook('u1', 'book-1');

    expect(result).toEqual([]);
  });

  test('excludes a due word with no rating yet (never-practiced extraction-time word)', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);

    putSection(store, 'book-1', 'section-1', {
      sectionNumber: 1,
      status: 'ready_to_read',
      wordIds: ['w1'],
    });
    putWord(store, 'w1', {
      userId: 'u1',
      word: 'never-rated',
      definition: 'def-never',
      lastRating: null,
      nextReviewDate: '2020-01-01',
      sectionRefs: [{ bookId: 'book-1', sectionId: 'section-1' }],
    });

    const result = await getPracticeQueueForBook('u1', 'book-1');

    expect(result).toEqual([]);
  });
});
