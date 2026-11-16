import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({ getAdminApp: vi.fn(() => ({})) }));

vi.mock('@/lib/firebase/server', () => ({
  getAuthedUser: vi.fn(),
}));

vi.mock('@/lib/sections/practiceQueue', () => ({
  getPracticeQueueForBook: vi.fn(),
}));

vi.mock('@/lib/sections/sectionService', () => ({
  maybeUnlockNextSection: vi.fn(),
}));

const { mockRedirect, mockNotFound } = vi.hoisted(() => ({
  mockRedirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  mockNotFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
  notFound: mockNotFound,
}));

import { getFirestore } from 'firebase-admin/firestore';
import { getAuthedUser } from '@/lib/firebase/server';
import { getPracticeQueueForBook } from '@/lib/sections/practiceQueue';
import { maybeUnlockNextSection } from '@/lib/sections/sectionService';
import BookPracticePage from './page';

const mockGetFirestore = getFirestore as unknown as ReturnType<typeof vi.fn>;
const mockGetAuthedUser = getAuthedUser as unknown as ReturnType<typeof vi.fn>;
const mockGetPracticeQueueForBook = getPracticeQueueForBook as unknown as ReturnType<typeof vi.fn>;
const mockMaybeUnlockNextSection = maybeUnlockNextSection as unknown as ReturnType<typeof vi.fn>;

type StoredDoc = Record<string, unknown>;

// A minimal fake Firestore, backed by an in-memory Map keyed by full
// document path, mirroring the fake-store style already used in
// lib/sections/practiceQueue.test.ts and
// app/book/[id]/practice/[sectionNumber]/page.test.tsx.
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

  function makeQuery(
    collectionPath: string,
    filters: { field: string; value: unknown }[],
    order?: { field: string; direction: 'asc' | 'desc' },
    limitN?: number
  ) {
    return {
      where(field: string, _op: '==', value: unknown) {
        return makeQuery(collectionPath, [...filters, { field, value }], order, limitN);
      },
      orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
        return makeQuery(collectionPath, filters, { field, direction }, limitN);
      },
      limit(n: number) {
        return makeQuery(collectionPath, filters, order, n);
      },
      async get() {
        let matches = directChildren(collectionPath).filter(([, data]) =>
          filters.every((f) => data[f.field] === f.value)
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
    };
  }

  const db = {
    collection(name: string) {
      return makeCollectionRef(name);
    },
  };

  return { db, store };
}

function putBook(store: Map<string, StoredDoc>, bookId: string, data: StoredDoc) {
  store.set(`books/${bookId}`, { ...data });
}

function putSection(store: Map<string, StoredDoc>, bookId: string, sectionId: string, data: StoredDoc) {
  store.set(`books/${bookId}/sections/${sectionId}`, { ...data });
}

beforeEach(() => {
  mockRedirect.mockClear();
  mockNotFound.mockClear();
  mockGetFirestore.mockReset();
  mockGetAuthedUser.mockReset();
  mockGetPracticeQueueForBook.mockReset();
  mockMaybeUnlockNextSection.mockReset();
  mockMaybeUnlockNextSection.mockResolvedValue(undefined);
});

describe('BookPracticePage', () => {
  test('visiting /practice/[bookId] with a zero-word unlocking section runs the unlock check and redirects back to /practice', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    putBook(store, 'book-1', { userId: 'user-1' });
    putSection(store, 'book-1', 'section-1', {
      sectionNumber: 1,
      status: 'ready_to_practice',
      wordIds: [],
    });
    mockGetPracticeQueueForBook.mockResolvedValue([]);

    await expect(
      BookPracticePage({ params: Promise.resolve({ bookId: 'book-1' }) })
    ).rejects.toThrow('NEXT_REDIRECT:/practice');

    expect(mockMaybeUnlockNextSection).toHaveBeenCalledWith('book-1', 'section-1');
    expect(mockRedirect).toHaveBeenCalledWith('/practice');
  });

  test('renders PracticeSession with the queue when there is something to practice', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    putBook(store, 'book-1', { userId: 'user-1' });
    mockGetPracticeQueueForBook.mockResolvedValue([
      { id: 'w1', word: 'ephemeral', definition: 'lasting a short time' },
    ]);

    const jsx = await BookPracticePage({ params: Promise.resolve({ bookId: 'book-1' }) });
    render(jsx);

    expect(screen.getByText('ephemeral')).toBeInTheDocument();
    expect(mockMaybeUnlockNextSection).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  test('an empty queue with no zero-word unlocking section renders normally (no redirect, no unlock call)', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    putBook(store, 'book-1', { userId: 'user-1' });
    // No ready_to_practice section at all (e.g. the book is fully read).
    mockGetPracticeQueueForBook.mockResolvedValue([]);

    await BookPracticePage({ params: Promise.resolve({ bookId: 'book-1' }) });

    expect(mockMaybeUnlockNextSection).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  test('returns 404 when the book does not belong to the authed user, and never calls getPracticeQueueForBook', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'attacker-uid' });
    putBook(store, 'book-1', { userId: 'victim-uid' });

    await expect(
      BookPracticePage({ params: Promise.resolve({ bookId: 'book-1' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(mockNotFound).toHaveBeenCalled();
    expect(mockGetPracticeQueueForBook).not.toHaveBeenCalled();
  });

  test('redirects to /login when there is no authed user', async () => {
    mockGetAuthedUser.mockResolvedValue(null);

    await expect(
      BookPracticePage({ params: Promise.resolve({ bookId: 'book-1' }) })
    ).rejects.toThrow('NEXT_REDIRECT:/login');

    expect(mockRedirect).toHaveBeenCalledWith('/login');
    expect(mockGetPracticeQueueForBook).not.toHaveBeenCalled();
  });
});
