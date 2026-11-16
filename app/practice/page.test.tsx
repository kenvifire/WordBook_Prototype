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

const { mockRedirect } = vi.hoisted(() => ({
  mockRedirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

import { getFirestore } from 'firebase-admin/firestore';
import { getAuthedUser } from '@/lib/firebase/server';
import { getPracticeQueueForBook } from '@/lib/sections/practiceQueue';
import PracticeTabPage from './page';

const mockGetFirestore = getFirestore as unknown as ReturnType<typeof vi.fn>;
const mockGetAuthedUser = getAuthedUser as unknown as ReturnType<typeof vi.fn>;
const mockGetPracticeQueueForBook = getPracticeQueueForBook as unknown as ReturnType<typeof vi.fn>;

type BookRow = { id: string; userId: string; title: string; author?: string | null };

// A minimal fake Firestore supporting exactly the one query this page needs:
// `books` collection filtered by `userId == uid` (mirrors the style already
// used in app/bookshelf/page.test.tsx).
function createFakeFirestore(books: BookRow[]) {
  return {
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
      };
    },
  };
}

beforeEach(() => {
  mockRedirect.mockClear();
  mockGetFirestore.mockReset();
  mockGetAuthedUser.mockReset();
  mockGetPracticeQueueForBook.mockReset();
});

describe('PracticeTabPage', () => {
  test('Practice tab lists every book with its due/practice count and a Practice button', async () => {
    const db = createFakeFirestore([
      { id: 'book-1', userId: 'user-1', title: 'Book One', author: 'Author A' },
    ]);
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    mockGetPracticeQueueForBook.mockResolvedValue([
      { id: 'w1', word: 'alpha', definition: 'def-a' },
      { id: 'w2', word: 'beta', definition: 'def-b' },
    ]);

    const jsx = await PracticeTabPage();
    render(jsx);

    expect(mockGetPracticeQueueForBook).toHaveBeenCalledWith('user-1', 'book-1');
    expect(screen.getByText('Book One')).toBeInTheDocument();
    expect(screen.getByText(/2 words to practice/i)).toBeInTheDocument();
    const practiceLink = screen.getByRole('link', { name: /^practice$/i });
    expect(practiceLink).toHaveAttribute('href', '/practice/book-1');
  });

  test('a book with nothing due and no unlocking section shows "Read instead" instead of a dead Practice button', async () => {
    const db = createFakeFirestore([{ id: 'book-1', userId: 'user-1', title: 'Book One' }]);
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    mockGetPracticeQueueForBook.mockResolvedValue([]);

    const jsx = await PracticeTabPage();
    render(jsx);

    const readLink = screen.getByRole('link', { name: /read instead/i });
    expect(readLink).toHaveAttribute('href', '/book/book-1');
    expect(screen.queryByRole('link', { name: /^practice$/i })).not.toBeInTheDocument();
  });

  test('redirects to /login when there is no authed user', async () => {
    mockGetAuthedUser.mockResolvedValue(null);

    await expect(PracticeTabPage()).rejects.toThrow('NEXT_REDIRECT:/login');
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });
});
