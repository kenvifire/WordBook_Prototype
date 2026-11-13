import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
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

// Supports select().eq().lte().not().order() resolving against an in-memory
// array of word rows, applying each filter as it's chained.
function makeWordsBuilder(rows: Row[]) {
  let filtered = [...rows];
  const builder: any = {};
  builder.select = vi.fn(() => {
    filtered = [...rows];
    return builder;
  });
  builder.eq = vi.fn((column: string, value: unknown) => {
    filtered = filtered.filter((r) => r[column] === value);
    return builder;
  });
  builder.lte = vi.fn((column: string, value: unknown) => {
    filtered = filtered.filter((r) => (r[column] as string) <= (value as string));
    return builder;
  });
  builder.not = vi.fn((column: string, operator: string, value: unknown) => {
    if (operator === 'is' && value === null) {
      filtered = filtered.filter((r) => r[column] !== null && r[column] !== undefined);
    }
    return builder;
  });
  builder.order = vi.fn(() => Promise.resolve({ data: filtered, error: null }));
  return builder;
}

function makeSupabaseMock(options: { user: { id: string } | null; words: Row[] }) {
  const words = makeWordsBuilder(options.words);

  const from = vi.fn((table: string) => {
    if (table === 'words') return words;
    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: options.user }, error: null }) },
    from,
    words,
  } as any;
}

beforeEach(() => {
  mockRedirect.mockClear();
  mockCreateClient.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-15T00:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ReviewPage (I9)', () => {
  test('an unrated word (last_rating null, e.g. just extracted from a book) does not appear', async () => {
    const supabase = makeSupabaseMock({
      user: { id: 'user-1' },
      words: [
        {
          id: 'word-1',
          user_id: 'user-1',
          word: 'nevertouched',
          definition: 'something',
          next_review_date: '2026-01-01',
          last_rating: null,
        },
      ],
    });
    mockCreateClient.mockResolvedValue(supabase);

    const jsx = await ReviewPage();
    render(jsx);

    expect(screen.queryByText('nevertouched')).not.toBeInTheDocument();
    expect(screen.getByText('No more words due for review right now.')).toBeInTheDocument();
  });

  test('a rated, due word appears', async () => {
    const supabase = makeSupabaseMock({
      user: { id: 'user-1' },
      words: [
        {
          id: 'word-1',
          user_id: 'user-1',
          word: 'alreadyrated',
          definition: 'something',
          next_review_date: '2026-01-01',
          last_rating: 'good',
        },
      ],
    });
    mockCreateClient.mockResolvedValue(supabase);

    const jsx = await ReviewPage();
    render(jsx);

    expect(screen.getByText('alreadyrated')).toBeInTheDocument();
  });
});
