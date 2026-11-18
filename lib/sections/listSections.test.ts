import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({ getAdminApp: vi.fn(() => ({})) }));

// maybeUnlockNextSection (used by the second test below) calls
// getUserProfile, which has its own `profile:` cache — mocked away wholesale
// here (same approach as lib/books/bookService.test.ts/listBooks.test.ts)
// so this file's fake Firestore only needs to support what listSections and
// maybeUnlockNextSection themselves touch: books, sections, words.
vi.mock('@/lib/users/userProfile', () => ({
  getUserProfile: vi.fn(),
}));

import { getFirestore } from 'firebase-admin/firestore';
import { getUserProfile } from '@/lib/users/userProfile';
import { invalidatePrefix } from '@/lib/cache/serverCache';
import { listSections } from './listSections';
import { maybeUnlockNextSection } from './sectionService';

const mockGetFirestore = getFirestore as unknown as ReturnType<typeof vi.fn>;
const mockGetUserProfile = getUserProfile as unknown as ReturnType<typeof vi.fn>;

type StoredDoc = Record<string, unknown>;

// A fake Firestore supporting both listSections' `.orderBy().get()` query
// shape and maybeUnlockNextSection's doc get/update plus
// `.where(...).limit(1)` query shape — same in-memory-Map style used
// throughout lib/sections/sectionService.test.ts and
// app/book/[id]/page.test.tsx, merged into one fake since this file
// exercises both.
function createFakeFirestore() {
  const store = new Map<string, StoredDoc>();
  const orderedGetCalls = { count: 0 };

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

  function makeQuery(
    collectionPath: string,
    filters: { field: string; value: unknown }[],
    orderField?: string,
    limitN?: number
  ): any {
    return {
      where(field: string, _op: '==', value: unknown) {
        return makeQuery(collectionPath, [...filters, { field, value }], orderField, limitN);
      },
      orderBy(field: string) {
        return makeQuery(collectionPath, filters, field, limitN);
      },
      limit(n: number) {
        return makeQuery(collectionPath, filters, orderField, n);
      },
      async get() {
        let matches = directChildren(collectionPath).filter(([, data]) =>
          filters.every((f) => data[f.field] === f.value)
        );
        if (orderField) {
          orderedGetCalls.count += 1;
          matches = [...matches].sort(
            (a, b) => ((a[1][orderField] as number) ?? 0) - ((b[1][orderField] as number) ?? 0)
          );
        }
        if (limitN !== undefined) {
          matches = matches.slice(0, limitN);
        }
        const docs = matches.map(([path, data]) => ({
          id: path.split('/').pop()!,
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
      orderBy(field: string) {
        return makeQuery(path, [], field);
      },
    };
  }

  const db = {
    collection(name: string) {
      return makeCollectionRef(name);
    },
  };

  return { db, store, orderedGetCalls };
}

function putBook(store: Map<string, StoredDoc>, bookId: string, data: StoredDoc) {
  store.set(`books/${bookId}`, { ...data });
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
  mockGetUserProfile.mockReset();
  mockGetUserProfile.mockResolvedValue({ recognitionThreshold: 0.8 });
  // listSections' cache is module-level state shared across every test in
  // this file (and across app/book/[id]/page.test.tsx, which also calls
  // listSections) — clear it so one test's cached section list never leaks
  // into another's, the same fix lib/books/listBooks.test.ts and
  // lib/users/userProfile.test.ts needed for their own caches.
  invalidatePrefix('sections:');
});

describe('listSections caching', () => {
  test('a second listSections call for the same bookId does not re-query Firestore', async () => {
    const { db, store, orderedGetCalls } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    putSection(store, 'book-1', 'section-1', { sectionNumber: 1, status: 'ready_to_practice' });

    await listSections('book-1');
    await listSections('book-1');

    expect(orderedGetCalls.count).toBe(1);
  });

  test('maybeUnlockNextSection invalidates the cached list for that book', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    putBook(store, 'book-1', { userId: 'u1' });
    putSection(store, 'book-1', 'section-1', {
      sectionNumber: 1,
      status: 'ready_to_practice',
      wordIds: ['w1'],
    });
    putWord(store, 'w1', { lastRating: 'good' });

    // Warm the cache with the pre-unlock status.
    const before = await listSections('book-1');
    expect(before.find((s) => s.id === 'section-1')?.status).toBe('ready_to_practice');

    await maybeUnlockNextSection('book-1', 'section-1');

    // The returned status reflects the unlock, not the stale cached value.
    const after = await listSections('book-1');
    expect(after.find((s) => s.id === 'section-1')?.status).toBe('ready_to_read');
  });
});
