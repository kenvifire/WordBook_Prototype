import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({ getAdminApp: vi.fn(() => ({})) }));

vi.mock('@/lib/firebase/server', () => ({
  getAuthedUser: vi.fn(),
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
import { maybeUnlockNextSection } from '@/lib/sections/sectionService';
import PracticePage from './page';

const mockGetFirestore = getFirestore as unknown as ReturnType<typeof vi.fn>;
const mockGetAuthedUser = getAuthedUser as unknown as ReturnType<typeof vi.fn>;
const mockMaybeUnlockNextSection = maybeUnlockNextSection as unknown as ReturnType<typeof vi.fn>;

type StoredDoc = Record<string, unknown>;

// A minimal fake Firestore, backed by an in-memory Map keyed by full document
// path, supporting exactly the operations this page needs: doc get, a
// single-field equality `.where(...).limit(1)` query over a subcollection's
// direct children, and nested `.collection()` off a doc ref — mirroring the
// fake-store style already used in lib/sections/sectionService.test.ts and
// app/api/words/[wordId]/rate/route.test.ts.
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

function putWord(store: Map<string, StoredDoc>, wordId: string, data: StoredDoc) {
  store.set(`words/${wordId}`, { ...data });
}

function getSection(store: Map<string, StoredDoc>, bookId: string, sectionId: string) {
  return store.get(`books/${bookId}/sections/${sectionId}`) as any;
}

beforeEach(() => {
  mockRedirect.mockClear();
  mockNotFound.mockClear();
  mockGetFirestore.mockReset();
  mockGetAuthedUser.mockReset();
  mockMaybeUnlockNextSection.mockReset();
  mockMaybeUnlockNextSection.mockResolvedValue(undefined);
});

describe('PracticePage', () => {
  test('shows every word in the section regardless of nextReviewDate (no due-date filter on this page)', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    putBook(store, 'book-1', { userId: 'user-1' });
    putSection(store, 'book-1', 'section-1', {
      sectionNumber: 1,
      status: 'ready_to_practice',
      wordIds: ['word-1'],
    });
    putWord(store, 'word-1', {
      userId: 'user-1',
      word: 'ephemeral',
      definition: 'lasting a short time',
      nextReviewDate: '2099-01-01',
    });

    const jsx = await PracticePage({
      params: Promise.resolve({ id: 'book-1', sectionNumber: '1' }),
    });
    render(jsx);

    // The practice page's job is "practice this section until it unlocks" —
    // it must show every word in the section regardless of due date, so a
    // word scheduled far in the future still shows up today.
    expect(screen.getByText('ephemeral')).toBeInTheDocument();
  });

  test('redirects to the book page when the section is locked', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    putBook(store, 'book-1', { userId: 'user-1' });
    putSection(store, 'book-1', 'section-1', {
      sectionNumber: 1,
      status: 'locked',
      wordIds: [],
    });

    await expect(
      PracticePage({ params: Promise.resolve({ id: 'book-1', sectionNumber: '1' }) })
    ).rejects.toThrow('NEXT_REDIRECT:/book/book-1');

    expect(mockRedirect).toHaveBeenCalledWith('/book/book-1');
    expect(mockMaybeUnlockNextSection).not.toHaveBeenCalled();
  });

  test.each(['ready_to_practice', 'ready_to_read', 'completed'])(
    'does not redirect when status is %s',
    async (status) => {
      const { db, store } = createFakeFirestore();
      mockGetFirestore.mockReturnValue(db);
      mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
      putBook(store, 'book-1', { userId: 'user-1' });
      putSection(store, 'book-1', 'section-1', {
        sectionNumber: 1,
        status,
        wordIds: ['word-1'],
      });
      putWord(store, 'word-1', { userId: 'user-1', word: 'ephemeral', definition: 'lasting a short time' });

      await PracticePage({ params: Promise.resolve({ id: 'book-1', sectionNumber: '1' }) });

      expect(mockRedirect).not.toHaveBeenCalled();
    }
  );

  test('C1: a zero-word section runs the unlock check and redirects to the book page when it unlocks', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    putBook(store, 'book-1', { userId: 'user-1' });
    putSection(store, 'book-1', 'section-1', {
      sectionNumber: 1,
      status: 'ready_to_practice',
      wordIds: [],
    });
    // Simulates maybeUnlockNextSection's real effect: it mutates the stored
    // section doc the way the production function would via its own
    // Firestore update.
    mockMaybeUnlockNextSection.mockImplementation(async () => {
      const current = getSection(store, 'book-1', 'section-1');
      store.set('books/book-1/sections/section-1', { ...current, status: 'ready_to_read' });
    });

    await expect(
      PracticePage({ params: Promise.resolve({ id: 'book-1', sectionNumber: '1' }) })
    ).rejects.toThrow('NEXT_REDIRECT:/book/book-1');

    expect(mockMaybeUnlockNextSection).toHaveBeenCalledWith('book-1', 'section-1');
    expect(mockRedirect).toHaveBeenCalledWith('/book/book-1');
  });

  test('C1: a zero-word section that does not unlock renders normally', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    putBook(store, 'book-1', { userId: 'user-1' });
    putSection(store, 'book-1', 'section-1', {
      sectionNumber: 1,
      status: 'ready_to_read',
      wordIds: [],
    });
    // Default mock: resolves without mutating the section (status was
    // already past ready_to_practice, so the real function wouldn't change it).

    await PracticePage({ params: Promise.resolve({ id: 'book-1', sectionNumber: '1' }) });

    expect(mockMaybeUnlockNextSection).toHaveBeenCalledWith('book-1', 'section-1');
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  test('a section with words never calls the unlock check (only the rate route does)', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    putBook(store, 'book-1', { userId: 'user-1' });
    putSection(store, 'book-1', 'section-1', {
      sectionNumber: 1,
      status: 'ready_to_practice',
      wordIds: ['word-1'],
    });
    putWord(store, 'word-1', { userId: 'user-1', word: 'ephemeral', definition: 'lasting a short time' });

    await PracticePage({ params: Promise.resolve({ id: 'book-1', sectionNumber: '1' }) });

    expect(mockMaybeUnlockNextSection).not.toHaveBeenCalled();
  });

  test('a word doc whose userId does not match the authed user is filtered out (ID-squatting defense in depth)', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'victim-uid' });
    putBook(store, 'book-1', { userId: 'victim-uid' });
    putSection(store, 'book-1', 'section-1', {
      sectionNumber: 1,
      status: 'ready_to_practice',
      wordIds: ['word-1', 'word-2'],
    });
    // Simulates an attacker-squatted doc id landing in the victim's own
    // section (e.g. written before the Firestore rules fix was deployed) —
    // this word doc's userId does not match the authed (victim) user.
    putWord(store, 'word-1', {
      userId: 'attacker-uid',
      word: 'squatted',
      definition: 'attacker-controlled content',
    });
    putWord(store, 'word-2', {
      userId: 'victim-uid',
      word: 'legitimate',
      definition: 'a real word the victim owns',
    });

    const jsx = await PracticePage({
      params: Promise.resolve({ id: 'book-1', sectionNumber: '1' }),
    });
    render(jsx);

    expect(screen.queryByText('squatted')).not.toBeInTheDocument();
    expect(screen.getByText('legitimate')).toBeInTheDocument();
  });
});
