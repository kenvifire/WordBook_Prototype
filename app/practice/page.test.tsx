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
type SectionRow = { id: string; sectionNumber: number; status: string; wordIds?: string[] };

// A minimal fake Firestore supporting the two query shapes this page needs:
// `books` collection filtered by `userId == uid` (mirrors the style already
// used in app/bookshelf/page.test.tsx), plus, per book,
// `books/{bookId}/sections` filtered by `status == 'ready_to_practice'`,
// ordered by sectionNumber, limited to 1 — the same zero-word-section check
// getPracticeQueueForBook and app/practice/[bookId]/page.tsx already do.
function createFakeFirestore(books: BookRow[], sectionsByBook: Record<string, SectionRow[]> = {}) {
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
        doc(bookId: string) {
          return {
            collection(subName: string) {
              if (subName !== 'sections') {
                throw new Error(`Unexpected subcollection in fake: ${subName}`);
              }
              const sections = sectionsByBook[bookId] ?? [];
              function makeQuery(filtered: SectionRow[], limitN?: number) {
                return {
                  where(field: string, op: string, value: unknown) {
                    if (field !== 'status' || op !== '==') {
                      throw new Error(`Unsupported filter in fake: ${field} ${op}`);
                    }
                    return makeQuery(
                      filtered.filter((s) => s.status === value),
                      limitN
                    );
                  },
                  orderBy() {
                    return makeQuery(
                      filtered.slice().sort((a, b) => a.sectionNumber - b.sectionNumber),
                      limitN
                    );
                  },
                  limit(n: number) {
                    return makeQuery(filtered, n);
                  },
                  async get() {
                    const limited = limitN !== undefined ? filtered.slice(0, limitN) : filtered;
                    const docs = limited.map((s) => ({ id: s.id, data: () => ({ ...s }) }));
                    return { empty: docs.length === 0, docs };
                  },
                };
              }
              return makeQuery(sections);
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

  test('I2: a book with an empty due-words queue AND a zero-word ready_to_practice section shows a Practice link, not Read instead', async () => {
    const db = createFakeFirestore(
      [{ id: 'book-1', userId: 'user-1', title: 'Book One' }],
      {
        'book-1': [
          { id: 'section-1', sectionNumber: 1, status: 'ready_to_practice', wordIds: [] },
        ],
      }
    );
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    mockGetPracticeQueueForBook.mockResolvedValue([]);

    const jsx = await PracticeTabPage();
    render(jsx);

    const practiceLink = screen.getByRole('link', { name: /^practice$/i });
    expect(practiceLink).toHaveAttribute('href', '/practice/book-1');
    expect(screen.queryByRole('link', { name: /read instead/i })).not.toBeInTheDocument();
  });

  test('the Practice tab list shows each book\'s practiceable state using design tokens, not ad-hoc colors', async () => {
    const db = createFakeFirestore([
      { id: 'book-1', userId: 'user-1', title: 'Practiceable Book' },
      { id: 'book-2', userId: 'user-1', title: 'Fully Read Book' },
    ]);
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    mockGetPracticeQueueForBook.mockImplementation((_uid: string, bookId: string) =>
      Promise.resolve(bookId === 'book-1' ? [{ id: 'w1', word: 'alpha', definition: 'def-a' }] : [])
    );

    const jsx = await PracticeTabPage();
    render(jsx);

    // Task 8's Step 3 resolves the Interfaces block's locked/unlocked mention
    // in favor of the same bg-ink/bg-surface primary/secondary pattern every
    // other action pair in this redesign uses — Practice/Read-instead are
    // navigational actions, not progress indicators, so no progress color.
    const practiceLink = screen.getByRole('link', { name: /^practice$/i });
    expect(practiceLink.className).toContain('bg-ink');
    expect(practiceLink.className).toContain('text-paper');
    expect(practiceLink.className).not.toMatch(/bg-(locked|practicing|unlocked|error|black)\b/);

    const readLink = screen.getByRole('link', { name: /read instead/i });
    expect(readLink.className).toContain('bg-surface');
    expect(readLink.className).toContain('border-hairline');
    expect(readLink.className).toContain('text-ink-muted');
    expect(readLink.className).not.toContain('text-gray-500');
  });

  test('redirects to /login when there is no authed user', async () => {
    mockGetAuthedUser.mockResolvedValue(null);

    await expect(PracticeTabPage()).rejects.toThrow('NEXT_REDIRECT:/login');
    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });
});
