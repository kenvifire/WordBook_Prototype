import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

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
}));

import { getFirestore } from 'firebase-admin/firestore';
import { getAuthedUser } from '@/lib/firebase/server';
import ReviewPage from './page';

const mockGetFirestore = getFirestore as unknown as ReturnType<typeof vi.fn>;
const mockGetAuthedUser = getAuthedUser as unknown as ReturnType<typeof vi.fn>;

type WordRow = Record<string, unknown>;

// A minimal fake Firestore supporting exactly the query this page issues:
// `words` collection, `.where('userId', '==', uid).where('nextReviewDate',
// '<=', today).orderBy('nextReviewDate')`. The `sectionRefs.length === 0 ||
// lastRating !== null` carve-out is applied in application code by the page
// itself, so this fake only needs to honor the Firestore-native filters —
// the regression-fix behavior is exercised through the page, not the fake.
function createFakeFirestore(words: WordRow[]) {
  function makeQuery(filters: { field: string; op: string; value: unknown }[]) {
    return {
      where(field: string, op: string, value: unknown) {
        return makeQuery([...filters, { field, op, value }]);
      },
      orderBy() {
        return this;
      },
      async get() {
        const docs = words
          .filter((row) =>
            filters.every((f) => {
              const actual = row[f.field];
              if (f.op === '==') return actual === f.value;
              if (f.op === '<=') return (actual as string) <= (f.value as string);
              throw new Error(`Unsupported op in fake: ${f.op}`);
            })
          )
          .map((row) => ({
            id: row.id as string,
            data: () => ({ ...row }),
          }));
        return { empty: docs.length === 0, docs };
      },
    };
  }

  const db = {
    collection(name: string) {
      if (name !== 'words') throw new Error(`Unexpected collection: ${name}`);
      return makeQuery([]);
    },
  };

  return db;
}

beforeEach(() => {
  mockRedirect.mockClear();
  mockGetFirestore.mockReset();
  mockGetAuthedUser.mockReset();
});

describe('ReviewPage', () => {
  test('I9 regression: a word added via "Add to my vocabulary" (no bookId, never rated) still appears', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const db = createFakeFirestore([
      {
        id: 'word-1',
        userId: 'user-1',
        word: 'serendipity',
        definition: 'a fortunate accident',
        sectionRefs: [],
        lastRating: null,
        nextReviewDate: today,
      },
    ]);
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const jsx = await ReviewPage();
    render(jsx);

    expect(screen.getByText('serendipity')).toBeInTheDocument();
  });

  test('a never-rated word that DOES belong to a book is excluded', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const db = createFakeFirestore([
      {
        id: 'word-1',
        userId: 'user-1',
        word: 'ephemeral',
        definition: 'lasting a short time',
        sectionRefs: [{ bookId: 'book-1', sectionId: 'section-1' }],
        lastRating: null,
        nextReviewDate: today,
      },
    ]);
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const jsx = await ReviewPage();
    render(jsx);

    expect(screen.queryByText('ephemeral')).not.toBeInTheDocument();
  });

  test('a rated word from a book still appears', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const db = createFakeFirestore([
      {
        id: 'word-1',
        userId: 'user-1',
        word: 'luminous',
        definition: 'giving off light',
        sectionRefs: [{ bookId: 'book-1', sectionId: 'section-1' }],
        lastRating: 'good',
        nextReviewDate: today,
      },
    ]);
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const jsx = await ReviewPage();
    render(jsx);

    expect(screen.getByText('luminous')).toBeInTheDocument();
  });

  test('redirects to /login when there is no authed user', async () => {
    mockGetAuthedUser.mockResolvedValue(null);

    await expect(ReviewPage()).rejects.toThrow('NEXT_REDIRECT:/login');

    expect(mockRedirect).toHaveBeenCalledWith('/login');
  });

  test('a word past its due date (nextReviewDate in the future) is excluded', async () => {
    const future = '2099-01-01';
    const db = createFakeFirestore([
      {
        id: 'word-1',
        userId: 'user-1',
        word: 'nebulous',
        definition: 'unclear',
        sectionRefs: [],
        lastRating: 'good',
        nextReviewDate: future,
      },
    ]);
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const jsx = await ReviewPage();
    render(jsx);

    expect(screen.queryByText('nebulous')).not.toBeInTheDocument();
  });
});
