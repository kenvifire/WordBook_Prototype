import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

const { mockRedirect } = vi.hoisted(() => ({
  mockRedirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

import { createClient } from '@/lib/supabase/server';
import ReviewPage from './page';

const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>;

type Row = Record<string, unknown>;

// Mirrors the real `.or('last_rating.not.is.null,book_id.is.null')`
// semantics against an in-memory table, so this test exercises the actual
// filter the regression fix depends on rather than a mock that always
// returns everything.
function makeWordsBuilder(rows: Row[]) {
  const builder: any = {};
  let userId: unknown;
  let maxDate: unknown;
  let orClause: string | undefined;

  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn((column: string, value: unknown) => {
    if (column === 'user_id') userId = value;
    return builder;
  });
  builder.lte = vi.fn((column: string, value: unknown) => {
    if (column === 'next_review_date') maxDate = value;
    return builder;
  });
  builder.or = vi.fn((clause: string) => {
    orClause = clause;
    return builder;
  });
  // `.order()` is the terminal call in the real query (the whole chain is
  // awaited), so it's where this mock actually applies every filter.
  builder.order = vi.fn(() => {
    const data = rows.filter((row) => {
      if (row.user_id !== userId) return false;
      if (maxDate !== undefined && (row.next_review_date as string) > (maxDate as string)) return false;
      if (!orClause) return true;
      const conditions = orClause.split(',');
      return conditions.some((cond) => {
        if (cond === 'last_rating.not.is.null') return row.last_rating !== null;
        if (cond === 'book_id.is.null') return row.book_id === null;
        return false;
      });
    });
    return Promise.resolve({ data, error: null });
  });
  return builder;
}

function makeSupabaseMock(options: { user: { id: string } | null; words: Row[] }) {
  const words = makeWordsBuilder(options.words);
  const from = vi.fn((table: string) => {
    if (table === 'words') return words;
    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: options.user }, error: null }),
    },
    from,
    words,
  } as any;
}

beforeEach(() => {
  mockRedirect.mockClear();
  mockCreateClient.mockReset();
});

describe('ReviewPage', () => {
  test('I9 regression: a word added via "Add to my vocabulary" (no book_id, never rated) still appears', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const supabase = makeSupabaseMock({
      user: { id: 'user-1' },
      words: [
        {
          id: 'word-1',
          word: 'serendipity',
          definition: 'a fortunate accident',
          user_id: 'user-1',
          book_id: null,
          last_rating: null,
          next_review_date: today,
        },
      ],
    });
    mockCreateClient.mockResolvedValue(supabase);

    const jsx = await ReviewPage();
    render(jsx);

    expect(screen.getByText('serendipity')).toBeInTheDocument();
  });

  test('a never-rated word that DOES belong to a book is still excluded (I9 original fix)', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const supabase = makeSupabaseMock({
      user: { id: 'user-1' },
      words: [
        {
          id: 'word-1',
          word: 'ephemeral',
          definition: 'lasting a short time',
          user_id: 'user-1',
          book_id: 'book-1',
          last_rating: null,
          next_review_date: today,
        },
      ],
    });
    mockCreateClient.mockResolvedValue(supabase);

    const jsx = await ReviewPage();
    render(jsx);

    expect(screen.queryByText('ephemeral')).not.toBeInTheDocument();
  });

  test('a rated word from a book still appears (unaffected by the exception)', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const supabase = makeSupabaseMock({
      user: { id: 'user-1' },
      words: [
        {
          id: 'word-1',
          word: 'luminous',
          definition: 'giving off light',
          user_id: 'user-1',
          book_id: 'book-1',
          last_rating: 'good',
          next_review_date: today,
        },
      ],
    });
    mockCreateClient.mockResolvedValue(supabase);

    const jsx = await ReviewPage();
    render(jsx);

    expect(screen.getByText('luminous')).toBeInTheDocument();
  });
});
