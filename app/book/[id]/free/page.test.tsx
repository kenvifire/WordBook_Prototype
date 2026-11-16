import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({ getAdminApp: vi.fn(() => ({})) }));

vi.mock('@/lib/firebase/server', () => ({
  getAuthedUser: vi.fn(),
}));

// Mocked so tests can inspect exactly what props this page passed through
// (word/language), while still rendering the tapped word as visible text for
// the "renders every section's text" assertions.
vi.mock('@/components/WordPopup', () => ({
  default: vi.fn(({ word }: { word: string; language: string }) => <span>{word}</span>),
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
import WordPopup from '@/components/WordPopup';
import FreeReadPage from './page';

const mockGetFirestore = getFirestore as unknown as ReturnType<typeof vi.fn>;
const mockGetAuthedUser = getAuthedUser as unknown as ReturnType<typeof vi.fn>;
const mockWordPopup = WordPopup as unknown as ReturnType<typeof vi.fn>;

type StoredDoc = Record<string, unknown>;

// A fake Firestore supporting exactly what this page needs: a books/{id} doc
// .get(), and that doc's "sections" subcollection via
// .orderBy('sectionNumber', 'asc').get() — mirroring the fake-store style
// used in app/book/[id]/page.test.tsx and
// app/book/[id]/read/[sectionNumber]/page.test.tsx.
//
// Crucially, every section document reachable from this fake — both the
// docs returned by the orderBy query (via `.ref`) and a doc fetched directly
// via `.collection('sections').doc(id)` — shares the SAME `updateSpy`/
// `setSpy` jest-mock functions. That makes the "never writes to any
// section's status field" test a genuine guard: if the page's
// implementation called `.update()`/`.set()` on ANY section doc reached
// through ANY of this fake's normal entry points, the shared spy would
// record the call. The assertion isn't trivially true just because the page
// happens not to call a particular helper — it's wired through the exact
// doc-ref objects the real implementation would have to use.
function createFakeFirestore() {
  const store = new Map<string, StoredDoc>();
  const updateSpy = vi.fn();
  const setSpy = vi.fn();

  function makeSectionDocRef(path: string) {
    const id = path.split('/').pop()!;
    return {
      id,
      async get() {
        const data = store.get(path);
        return {
          exists: data !== undefined,
          id,
          data: () => (data ? { ...data } : undefined),
        };
      },
      update: updateSpy,
      set: setSpy,
    };
  }

  function makeBookDocRef(path: string) {
    const id = path.split('/').pop()!;
    return {
      id,
      async get() {
        const data = store.get(path);
        return {
          exists: data !== undefined,
          id,
          data: () => (data ? { ...data } : undefined),
        };
      },
      collection(name: string) {
        if (name !== 'sections') throw new Error(`Unexpected subcollection: ${name}`);
        const sectionsPrefix = `${path}/sections/`;
        return {
          doc(sectionId: string) {
            return makeSectionDocRef(`${sectionsPrefix}${sectionId}`);
          },
          orderBy(field: string, direction: string) {
            if (field !== 'sectionNumber' || direction !== 'asc') {
              throw new Error(`Unsupported orderBy in fake: ${field} ${direction}`);
            }
            return {
              async get() {
                const docs = Array.from(store.entries())
                  .filter(
                    ([p]) => p.startsWith(sectionsPrefix) && !p.slice(sectionsPrefix.length).includes('/')
                  )
                  .map(([p, data]) => {
                    const docId = p.split('/').pop()!;
                    return {
                      id: docId,
                      ref: makeSectionDocRef(p),
                      data: () => ({ ...data }),
                    };
                  })
                  .sort(
                    (a, b) => (a.data().sectionNumber as number) - (b.data().sectionNumber as number)
                  );
                return { docs };
              },
            };
          },
        };
      },
    };
  }

  const db = {
    collection(name: string) {
      if (name !== 'books') throw new Error(`Unexpected top-level collection: ${name}`);
      return {
        doc(id: string) {
          return makeBookDocRef(`books/${id}`);
        },
      };
    },
  };

  return { db, store, updateSpy, setSpy };
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
  mockWordPopup.mockClear();
});

describe('FreeReadPage', () => {
  test("renders every section's text concatenated, regardless of status", async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    putBook(store, 'book-1', { userId: 'user-1', title: 'My Book', language: 'english' });
    putSection(store, 'book-1', 'section-1', { sectionNumber: 1, status: 'locked', text: 'alpha' });
    putSection(store, 'book-1', 'section-2', {
      sectionNumber: 2,
      status: 'ready_to_practice',
      text: 'beta',
    });
    putSection(store, 'book-1', 'section-3', { sectionNumber: 3, status: 'ready_to_read', text: 'gamma' });
    putSection(store, 'book-1', 'section-4', { sectionNumber: 4, status: 'completed', text: 'delta' });

    const jsx = await FreeReadPage({ params: Promise.resolve({ id: 'book-1' }) });
    render(jsx);

    expect(screen.getByText('alpha')).toBeInTheDocument();
    expect(screen.getByText('beta')).toBeInTheDocument();
    expect(screen.getByText('gamma')).toBeInTheDocument();
    expect(screen.getByText('delta')).toBeInTheDocument();
  });

  test("each word is tappable via WordPopup with the book's language", async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    putBook(store, 'book-1', { userId: 'user-1', title: 'My Book', language: 'spanish' });
    putSection(store, 'book-1', 'section-1', {
      sectionNumber: 1,
      status: 'locked',
      text: 'hola mundo',
    });

    const jsx = await FreeReadPage({ params: Promise.resolve({ id: 'book-1' }) });
    render(jsx);

    expect(mockWordPopup).toHaveBeenCalled();
    for (const call of mockWordPopup.mock.calls) {
      expect(call[0]).toMatchObject({ language: 'spanish' });
    }
    const words = mockWordPopup.mock.calls.map((call) => call[0].word);
    expect(words).toEqual(['hola', 'mundo']);
  });

  test('loading this page never writes to any section\'s status field', async () => {
    const { db, store, updateSpy, setSpy } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    putBook(store, 'book-1', { userId: 'user-1', title: 'My Book', language: 'english' });
    putSection(store, 'book-1', 'section-1', { sectionNumber: 1, status: 'locked', text: 'alpha' });
    putSection(store, 'book-1', 'section-2', {
      sectionNumber: 2,
      status: 'ready_to_practice',
      text: 'beta',
    });
    putSection(store, 'book-1', 'section-3', { sectionNumber: 3, status: 'ready_to_read', text: 'gamma' });

    const jsx = await FreeReadPage({ params: Promise.resolve({ id: 'book-1' }) });
    render(jsx);

    expect(updateSpy).not.toHaveBeenCalled();
    expect(setSpy).not.toHaveBeenCalled();

    // Confirm the state in the store is byte-for-byte unchanged too, not
    // just that the spy methods weren't invoked.
    expect(store.get('books/book-1/sections/section-1')).toEqual({
      sectionNumber: 1,
      status: 'locked',
      text: 'alpha',
    });
  });
});
