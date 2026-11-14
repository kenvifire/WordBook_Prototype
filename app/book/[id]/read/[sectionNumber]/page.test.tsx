import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({ getAdminApp: vi.fn(() => ({})) }));

vi.mock('@/lib/firebase/server', () => ({
  getAuthedUser: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
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
import ReadPage from './page';

const mockGetFirestore = getFirestore as unknown as ReturnType<typeof vi.fn>;
const mockGetAuthedUser = getAuthedUser as unknown as ReturnType<typeof vi.fn>;

type StoredDoc = Record<string, unknown>;

// A minimal fake Firestore, backed by an in-memory Map keyed by full document
// path, supporting exactly the operations this page needs: doc get, a
// single-field equality `.where(...).limit(1)` query over a subcollection's
// direct children, and nested `.collection()` off a doc ref — mirroring the
// fake-store style already used in app/book/[id]/practice/[sectionNumber]/page.test.tsx.
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

function makeSectionText(wordCount: number) {
  return Array.from({ length: wordCount }, () => 'word').join(' ');
}

beforeEach(() => {
  mockRedirect.mockClear();
  mockNotFound.mockClear();
  mockGetFirestore.mockReset();
  mockGetAuthedUser.mockReset();
});

describe('ReadPage', () => {
  test('redirects to the book page unless the section status is ready_to_read or completed', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    putBook(store, 'book-1', { userId: 'user-1', title: 'My Book' });
    putSection(store, 'book-1', 'section-1', {
      sectionNumber: 1,
      status: 'ready_to_practice',
      text: makeSectionText(5),
    });

    await expect(
      ReadPage({ params: Promise.resolve({ id: 'book-1', sectionNumber: '1' }) })
    ).rejects.toThrow('NEXT_REDIRECT:/book/book-1');

    expect(mockRedirect).toHaveBeenCalledWith('/book/book-1');
  });

  test.each(['ready_to_read', 'completed'])('does not redirect when status is %s', async (status) => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    putBook(store, 'book-1', { userId: 'user-1', title: 'My Book' });
    putSection(store, 'book-1', 'section-1', {
      sectionNumber: 1,
      status,
      text: makeSectionText(5),
    });

    await ReadPage({ params: Promise.resolve({ id: 'book-1', sectionNumber: '1' }) });

    expect(mockRedirect).not.toHaveBeenCalled();
  });

  test('renders the section text from its own `text` field, with each word wrapped for tap-to-define', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    putBook(store, 'book-1', { userId: 'user-1', title: 'My Book' });
    putSection(store, 'book-1', 'section-1', {
      sectionNumber: 1,
      status: 'ready_to_read',
      // The page renders straight from this field now — no book-level
      // rawText or word-index slicing involved (Important #3).
      text: 'beta gamma',
    });

    const jsx = await ReadPage({ params: Promise.resolve({ id: 'book-1', sectionNumber: '1' }) });
    render(jsx);

    expect(screen.getByText('beta')).toBeInTheDocument();
    expect(screen.getByText('gamma')).toBeInTheDocument();
    expect(screen.queryByText('alpha')).not.toBeInTheDocument();
    expect(screen.queryByText('delta')).not.toBeInTheDocument();
  });

  describe('prev/next navigation (I3)', () => {
    test('shows a previous-section link once past section 1, and no next-section link when there is no next section', async () => {
      const { db, store } = createFakeFirestore();
      mockGetFirestore.mockReturnValue(db);
      mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
      putBook(store, 'book-1', { userId: 'user-1', title: 'My Book' });
      putSection(store, 'book-1', 'section-2', {
        sectionNumber: 2,
        status: 'ready_to_read',
        text: makeSectionText(5),
      });

      const jsx = await ReadPage({ params: Promise.resolve({ id: 'book-1', sectionNumber: '2' }) });
      render(jsx);

      expect(screen.getByRole('link', { name: '← Previous section' })).toHaveAttribute(
        'href',
        '/book/book-1/read/1'
      );
      expect(screen.queryByRole('link', { name: 'Next section →' })).not.toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Back to book' })).toHaveAttribute('href', '/book/book-1');
    });

    test('has no previous-section link on section 1', async () => {
      const { db, store } = createFakeFirestore();
      mockGetFirestore.mockReturnValue(db);
      mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
      putBook(store, 'book-1', { userId: 'user-1', title: 'My Book' });
      putSection(store, 'book-1', 'section-1', {
        sectionNumber: 1,
        status: 'ready_to_read',
        text: makeSectionText(5),
      });

      const jsx = await ReadPage({ params: Promise.resolve({ id: 'book-1', sectionNumber: '1' }) });
      render(jsx);

      expect(screen.queryByRole('link', { name: '← Previous section' })).not.toBeInTheDocument();
    });

    test('links next section to its practice page when it is only ready_to_practice', async () => {
      const { db, store } = createFakeFirestore();
      mockGetFirestore.mockReturnValue(db);
      mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
      putBook(store, 'book-1', { userId: 'user-1', title: 'My Book' });
      putSection(store, 'book-1', 'section-1', {
        sectionNumber: 1,
        status: 'ready_to_read',
        text: makeSectionText(5),
      });
      putSection(store, 'book-1', 'section-2', {
        sectionNumber: 2,
        status: 'ready_to_practice',
      });

      const jsx = await ReadPage({ params: Promise.resolve({ id: 'book-1', sectionNumber: '1' }) });
      render(jsx);

      expect(screen.getByRole('link', { name: 'Next section →' })).toHaveAttribute(
        'href',
        '/book/book-1/practice/2'
      );
    });

    test('links next section to its read page when it is ready_to_read or completed', async () => {
      const { db, store } = createFakeFirestore();
      mockGetFirestore.mockReturnValue(db);
      mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
      putBook(store, 'book-1', { userId: 'user-1', title: 'My Book' });
      putSection(store, 'book-1', 'section-1', {
        sectionNumber: 1,
        status: 'ready_to_read',
        text: makeSectionText(5),
      });
      putSection(store, 'book-1', 'section-2', {
        sectionNumber: 2,
        status: 'completed',
      });

      const jsx = await ReadPage({ params: Promise.resolve({ id: 'book-1', sectionNumber: '1' }) });
      render(jsx);

      expect(screen.getByRole('link', { name: 'Next section →' })).toHaveAttribute(
        'href',
        '/book/book-1/read/2'
      );
    });

    test('no next-section link when the next section is still locked', async () => {
      const { db, store } = createFakeFirestore();
      mockGetFirestore.mockReturnValue(db);
      mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
      putBook(store, 'book-1', { userId: 'user-1', title: 'My Book' });
      putSection(store, 'book-1', 'section-1', {
        sectionNumber: 1,
        status: 'ready_to_read',
        text: makeSectionText(5),
      });
      putSection(store, 'book-1', 'section-2', {
        sectionNumber: 2,
        status: 'locked',
      });

      const jsx = await ReadPage({ params: Promise.resolve({ id: 'book-1', sectionNumber: '1' }) });
      render(jsx);

      expect(screen.queryByRole('link', { name: 'Next section →' })).not.toBeInTheDocument();
    });
  });
});
