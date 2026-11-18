import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({ getAdminApp: vi.fn(() => ({})) }));

vi.mock('@/lib/firebase/server', () => ({
  getAuthedUser: vi.fn(),
}));

const { mockRedirect, mockRefresh } = vi.hoisted(() => ({
  mockRedirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  mockRefresh: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn() }),
}));

import { getFirestore } from 'firebase-admin/firestore';
import { getAuthedUser } from '@/lib/firebase/server';
import { invalidatePrefix } from '@/lib/cache/serverCache';
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
  generationStatus?: 'pending' | 'ready' | 'failed';
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
  mockRefresh.mockClear();
  mockGetFirestore.mockReset();
  mockGetAuthedUser.mockReset();
  // listBooks' cache is module-level state shared across tests in this
  // file, and every test here reuses the same uid ('user-1') with
  // different expected book-list fixtures — clear it so one test's cached
  // result never leaks into another's (same fix lib/sections/
  // sectionService.test.ts and lib/users/userProfile.test.ts needed for
  // the profile cache).
  invalidatePrefix('books:');
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

    // "N of M sections unlocked" text was replaced by a visual spine
    // (components/BookshelfList.test.tsx's own tests cover the color
    // mapping in detail) — scoped to "Ready Book"'s own card, which has 2
    // sections with 1 unlocked, to confirm the page still renders the
    // right counts end-to-end, not just that BookshelfList can render
    // *a* spine in isolation.
    const readyCard = screen.getByText('Ready Book').closest('a');
    const segments = within(readyCard as HTMLElement).getAllByTestId('spine-segment');
    expect(segments).toHaveLength(2);
    expect(segments.filter((s) => s.className.includes('bg-unlocked'))).toHaveLength(1);
  });

  test('a book card with generationStatus: "pending" shows a "generating…" placeholder instead of its progress indicator', async () => {
    const db = createFakeFirestore(
      [
        {
          id: 'book-gen',
          userId: 'user-1',
          title: 'A Mystery On A Train',
          language: 'spanish',
          source: 'ai_generated',
          generationStatus: 'pending',
        },
      ],
      { 'book-gen': [] }
    );
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const jsx = await BookshelfPage();
    render(jsx);

    expect(screen.getByText('A Mystery On A Train')).toBeInTheDocument();
    expect(screen.getByText(/generating/i)).toBeInTheDocument();
    expect(screen.queryByText(/sections unlocked/)).not.toBeInTheDocument();
    // Per the known gap: a pending/failed card must not link anywhere —
    // Book Detail has no awareness of generationStatus yet.
    expect(screen.queryByRole('link', { name: /a mystery on a train/i })).not.toBeInTheDocument();
  });

  test('a book card with generationStatus: "failed" shows a visible error state, not a silent disappearance', async () => {
    const db = createFakeFirestore(
      [
        {
          id: 'book-failed',
          userId: 'user-1',
          title: 'A Mystery On A Train',
          language: 'spanish',
          source: 'ai_generated',
          generationStatus: 'failed',
        },
      ],
      { 'book-failed': [] }
    );
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const jsx = await BookshelfPage();
    render(jsx);

    expect(screen.getByText('A Mystery On A Train')).toBeInTheDocument();
    expect(screen.getByText(/fail/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /a mystery on a train/i })).not.toBeInTheDocument();
  });

  // Fix 6: mirrors app/book/[id]/page.tsx's own stale-pending override — a
  // generated book stuck in 'pending' (e.g. a server restart mid-
  // generation) reads as 'failed' once its createdAt is more than 5
  // minutes old, display-only (never written back to Firestore). This also
  // naturally stops BookshelfPendingPoller from polling forever for a
  // permanently-stuck book, since hasPendingGeneration is computed from
  // this same mapped array.
  test('Fix 6: a pending book with createdAt more than 5 minutes old renders as failed; a recent pending book still shows pending', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-01-01T00:10:00.000Z'));

      const staleCreatedAt = { toDate: () => new Date('2026-01-01T00:00:00.000Z') }; // 10 min old
      const recentCreatedAt = { toDate: () => new Date('2026-01-01T00:09:00.000Z') }; // 1 min old

      const db = createFakeFirestore(
        [
          {
            id: 'book-stale',
            userId: 'user-1',
            title: 'Stale Pending Book',
            language: 'english',
            source: 'ai_generated',
            generationStatus: 'pending',
            createdAt: staleCreatedAt as unknown,
          },
          {
            id: 'book-recent',
            userId: 'user-1',
            title: 'Recent Pending Book',
            language: 'spanish',
            source: 'ai_generated',
            generationStatus: 'pending',
            createdAt: recentCreatedAt as unknown,
          },
        ],
        { 'book-stale': [], 'book-recent': [] }
      );
      mockGetFirestore.mockReturnValue(db);
      mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

      const jsx = await BookshelfPage();
      render(jsx);

      // Stale pending -> displayed as failed, not as still-generating.
      expect(screen.getByText('Stale Pending Book')).toBeInTheDocument();
      expect(screen.getByText(/fail/i)).toBeInTheDocument();

      // Recent pending -> still shows the pending placeholder.
      expect(screen.getByText('Recent Pending Book')).toBeInTheDocument();
      expect(screen.getByText(/generating/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  test('the Bookshelf polls (re-fetches) while any book is pending, and stops once none are', async () => {
    vi.useFakeTimers();
    try {
      const pendingDb = createFakeFirestore(
        [
          {
            id: 'book-gen',
            userId: 'user-1',
            title: 'Pending Book',
            language: 'english',
            source: 'ai_generated',
            generationStatus: 'pending',
          },
        ],
        { 'book-gen': [] }
      );
      mockGetFirestore.mockReturnValue(pendingDb);
      mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

      const firstJsx = await BookshelfPage();
      const { rerender } = render(firstJsx);

      await vi.advanceTimersByTimeAsync(3000);
      expect(mockRefresh).toHaveBeenCalledTimes(1);

      // Simulate the effect of that refresh: the server now reports
      // generation finished, so the parent re-renders with a prop that no
      // longer contains a pending book.
      const readyDb = createFakeFirestore(
        [
          {
            id: 'book-gen',
            userId: 'user-1',
            title: 'Pending Book',
            language: 'english',
            source: 'ai_generated',
            generationStatus: 'ready',
          },
        ],
        { 'book-gen': [{ status: 'locked' }] }
      );
      mockGetFirestore.mockReturnValue(readyDb);
      // listBooks' 15s cache is still warm at this point (only 3s of fake
      // time has elapsed) — this test is exercising BookshelfPendingPoller's
      // own start/stop-interval behavior, not the cache's TTL (that's
      // covered by lib/books/listBooks.test.ts), so force a fresh read here
      // the same way a real post-TTL request would get one.
      invalidatePrefix('books:');

      const secondJsx = await BookshelfPage();
      rerender(secondJsx);

      await vi.advanceTimersByTimeAsync(10000);
      // No further refreshes once no book is pending anymore.
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  test('redirects to /login when there is no authed user', async () => {
    mockGetAuthedUser.mockResolvedValue(null);

    await expect(BookshelfPage()).rejects.toThrow('NEXT_REDIRECT:/login');

    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });
});
