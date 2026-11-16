import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({ getAdminApp: vi.fn(() => ({})) }));

vi.mock('@/lib/firebase/server', () => ({
  getAuthedUser: vi.fn(),
}));

const { mockRedirect } = vi.hoisted(() => ({
  mockRedirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import { getFirestore } from 'firebase-admin/firestore';
import { getAuthedUser } from '@/lib/firebase/server';
import BookshelfPage from './page';

const mockGetFirestore = getFirestore as unknown as ReturnType<typeof vi.fn>;
const mockGetAuthedUser = getAuthedUser as unknown as ReturnType<typeof vi.fn>;

type BookRow = {
  id: string;
  userId: string;
  title: string;
  author?: string | null;
  language: string;
  createdAt?: unknown;
  source?: string;
  sectioningMethod?: string | null;
};

type SectionRow = { status: string };

// A minimal fake Firestore supporting:
// - `books` collection: `.where('userId', '==', uid).orderBy('createdAt', 'desc').get()`
// - `books/{id}/sections` subcollection: `.get()` (used for the per-book progress count)
function createFakeFirestore(books: BookRow[], sectionsByBookId: Record<string, SectionRow[]>) {
  const db = {
    collection(name: string) {
      if (name !== 'books') throw new Error(`Unexpected top-level collection: ${name}`);
      return {
        where(field: string, op: string, value: unknown) {
          if (field !== 'userId' || op !== '==') {
            throw new Error(`Unsupported filter in fake: ${field} ${op}`);
          }
          return {
            orderBy() {
              return this;
            },
            async get() {
              const docs = books
                .filter((b) => b.userId === value)
                .map((b) => ({ id: b.id, data: () => ({ ...b }) }));
              return { empty: docs.length === 0, docs };
            },
          };
        },
        doc(id: string) {
          return {
            collection(sub: string) {
              if (sub !== 'sections') throw new Error(`Unexpected subcollection: ${sub}`);
              return {
                async get() {
                  const sections = sectionsByBookId[id] ?? [];
                  const docs = sections.map((s) => ({ data: () => ({ ...s }) }));
                  return { empty: docs.length === 0, docs };
                },
              };
            },
          };
        },
      };
    },
  };

  return db;
}

beforeEach(() => {
  mockRedirect.mockClear();
  mockGetFirestore.mockReset();
  mockGetAuthedUser.mockReset();
});

describe('BookshelfPage', () => {
  test('groups books by language and "All" shows every book; selecting a language chip filters', async () => {
    const db = createFakeFirestore(
      [
        { id: 'book-en', userId: 'user-1', title: 'The English Book', language: 'english' },
        { id: 'book-es', userId: 'user-1', title: 'El Libro Espanol', language: 'spanish' },
      ],
      {
        'book-en': [{ status: 'ready_to_read' }, { status: 'locked' }],
        'book-es': [{ status: 'ready_to_read' }],
      }
    );
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const jsx = await BookshelfPage();
    render(jsx);

    expect(screen.getByText('The English Book')).toBeInTheDocument();
    expect(screen.getByText('El Libro Espanol')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /spanish/i }));

    expect(screen.queryByText('The English Book')).not.toBeInTheDocument();
    expect(screen.getByText('El Libro Espanol')).toBeInTheDocument();
  });

  // Minor #5: an uploaded book that hasn't finished its deferred-sectioning
  // setup yet (source: 'uploaded', sectioningMethod still null) has zero
  // sections — this must surface as needsSetup: true so the list component
  // can show "Not yet started" instead of "0 of 0 sections unlocked".
  test('a book with source: "uploaded" and sectioningMethod: null shows "Not yet started"', async () => {
    const db = createFakeFirestore(
      [
        {
          id: 'book-pending',
          userId: 'user-1',
          title: 'Pending Book',
          language: 'english',
          source: 'uploaded',
          sectioningMethod: null,
        },
        {
          id: 'book-ready',
          userId: 'user-1',
          title: 'Ready Book',
          language: 'english',
          source: 'uploaded',
          sectioningMethod: 'by_page',
        },
      ],
      {
        'book-pending': [],
        'book-ready': [{ status: 'ready_to_read' }, { status: 'locked' }],
      }
    );
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const jsx = await BookshelfPage();
    render(jsx);

    expect(screen.getByText('Not yet started')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 sections unlocked')).toBeInTheDocument();
  });

  test('redirects to /login when there is no authed user', async () => {
    mockGetAuthedUser.mockResolvedValue(null);

    await expect(BookshelfPage()).rejects.toThrow('NEXT_REDIRECT:/login');

    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });
});
