import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({ getAdminApp: vi.fn(() => ({})) }));

vi.mock('@/lib/firebase/server', () => ({
  getAuthedUser: vi.fn(),
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
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import { getFirestore } from 'firebase-admin/firestore';
import { getAuthedUser } from '@/lib/firebase/server';
import BookDetailPage from './page';

const mockGetFirestore = getFirestore as unknown as ReturnType<typeof vi.fn>;
const mockGetAuthedUser = getAuthedUser as unknown as ReturnType<typeof vi.fn>;

type StoredDoc = Record<string, unknown>;

// A minimal fake Firestore supporting exactly what this page needs: a
// books/{id} doc .get(), and that doc's "sections" subcollection via
// .orderBy('sectionNumber', 'asc').get() — mirroring the fake-store style
// used in app/bookshelf/page.test.tsx and
// app/book/[id]/practice/[sectionNumber]/page.test.tsx.
function createFakeFirestore(book: StoredDoc | undefined, sections: StoredDoc[]) {
  const sectionDocs = [...sections]
    .sort((a, b) => (a.sectionNumber as number) - (b.sectionNumber as number))
    .map((data, index) => ({ id: `section-${index + 1}`, data: () => ({ ...data }) }));

  const bookRef = {
    async get() {
      return {
        exists: book !== undefined,
        data: () => (book ? { ...book } : undefined),
      };
    },
    collection(name: string) {
      if (name !== 'sections') throw new Error(`Unexpected subcollection: ${name}`);
      return {
        orderBy(field: string, direction: string) {
          if (field !== 'sectionNumber' || direction !== 'asc') {
            throw new Error(`Unsupported orderBy in fake: ${field} ${direction}`);
          }
          return {
            async get() {
              return { docs: sectionDocs };
            },
          };
        },
      };
    },
  };

  const db = {
    collection(name: string) {
      if (name !== 'books') throw new Error(`Unexpected top-level collection: ${name}`);
      return {
        doc() {
          return bookRef;
        },
      };
    },
  };

  return db;
}

beforeEach(() => {
  mockRedirect.mockClear();
  mockNotFound.mockClear();
  mockGetFirestore.mockReset();
  mockGetAuthedUser.mockReset();
});

describe('BookDetailPage', () => {
  // Review Focus #4 of the plan: "A user who abandons the first-open setup
  // screen without confirming a method, then revisits the book, must land
  // back on the same setup screen." Revisiting the book page is simply
  // re-rendering this Server Component against the same (still-unset)
  // Firestore state, which is exactly what this test does — there is no
  // separate "first visit" vs. "abandoned and revisited" code path, so one
  // test covers both: the setup screen is derived purely from
  // `source`/`sectioningMethod`, never from whether this is the first time
  // the page has been requested.
  test('a book with sectioningMethod: null and source: uploaded shows the setup screen (covers both first visit and abandon-then-revisit, since both render this same Firestore state)', async () => {
    const db = createFakeFirestore(
      {
        userId: 'user-1',
        title: 'My Book',
        source: 'uploaded',
        sectioningMethod: null,
        detectedChapterBreaks: null,
        language: 'en',
      },
      []
    );
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const jsx = await BookDetailPage({ params: Promise.resolve({ id: 'book-1' }) });
    render(jsx);

    expect(screen.getByRole('heading', { name: /set up/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^section reading$/i })).not.toBeInTheDocument();
  });

  test('the setup screen offers "by chapter" only when detectedChapterBreaks is non-null', async () => {
    const withChapters = createFakeFirestore(
      {
        userId: 'user-1',
        title: 'My Book',
        source: 'uploaded',
        sectioningMethod: null,
        detectedChapterBreaks: [0, 500, 1200],
        language: 'en',
      },
      []
    );
    mockGetFirestore.mockReturnValue(withChapters);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const jsxWithChapters = await BookDetailPage({ params: Promise.resolve({ id: 'book-1' }) });
    const { unmount } = render(jsxWithChapters);
    expect(screen.getByRole('button', { name: /by chapter/i })).toBeInTheDocument();
    unmount();

    const withoutChapters = createFakeFirestore(
      {
        userId: 'user-1',
        title: 'My Book',
        source: 'uploaded',
        sectioningMethod: null,
        detectedChapterBreaks: null,
        language: 'en',
      },
      []
    );
    mockGetFirestore.mockReturnValue(withoutChapters);

    const jsxWithoutChapters = await BookDetailPage({ params: Promise.resolve({ id: 'book-1' }) });
    render(jsxWithoutChapters);
    expect(screen.queryByRole('button', { name: /by chapter/i })).not.toBeInTheDocument();
  });

  test('the setup screen offers a "start Free reading" escape without choosing a method', async () => {
    const db = createFakeFirestore(
      {
        userId: 'user-1',
        title: 'My Book',
        source: 'uploaded',
        sectioningMethod: null,
        detectedChapterBreaks: null,
        language: 'en',
      },
      []
    );
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const jsx = await BookDetailPage({ params: Promise.resolve({ id: 'book-1' }) });
    render(jsx);

    const freeReadingLink = screen.getByRole('link', { name: /free reading/i });
    expect(freeReadingLink).toHaveAttribute('href', '/book/book-1/free');
  });

  test('a book with a sectioningMethod already set shows the normal Free/Section toggle + section list', async () => {
    const db = createFakeFirestore(
      {
        userId: 'user-1',
        title: 'My Book',
        source: 'uploaded',
        sectioningMethod: 'by_page',
        detectedChapterBreaks: null,
        language: 'en',
      },
      [{ sectionNumber: 1, status: 'ready_to_practice' }]
    );
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const jsx = await BookDetailPage({ params: Promise.resolve({ id: 'book-1' }) });
    render(jsx);

    expect(screen.getByRole('button', { name: /^free reading$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^section reading$/i })).toBeInTheDocument();
    expect(screen.getByText('Section 1')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /set up/i })).not.toBeInTheDocument();
  });

  test('a generated book (source: ai_generated) never shows the setup screen even with no prior visit', async () => {
    const db = createFakeFirestore(
      {
        userId: 'user-1',
        title: 'Generated Story',
        source: 'ai_generated',
        sectioningMethod: null,
        detectedChapterBreaks: null,
        language: 'en',
      },
      [{ sectionNumber: 1, status: 'ready_to_practice' }]
    );
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const jsx = await BookDetailPage({ params: Promise.resolve({ id: 'book-1' }) });
    render(jsx);

    expect(screen.queryByRole('heading', { name: /set up/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^free reading$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^section reading$/i })).toBeInTheDocument();
  });
});
