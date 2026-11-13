import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
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

import { createClient } from '@/lib/supabase/server';
import PracticePage from './page';

const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>;

type Row = Record<string, unknown>;

// Generic chainable builder: select()/eq()*/single() resolves against an
// in-memory table filtered by every .eq() call so far, matching the
// chain-mocking style already used in lib/sections/sectionService.test.ts
// and app/api/words/[wordId]/rate/route.test.ts.
function makeSingleRowBuilder(table: Row[]) {
  let filters: Record<string, unknown> = {};
  const builder: any = {};
  builder.select = vi.fn(() => {
    filters = {};
    return builder;
  });
  builder.eq = vi.fn((column: string, value: unknown) => {
    filters = { ...filters, [column]: value };
    return builder;
  });
  builder.single = vi.fn(() => {
    const row = table.find((r) => Object.entries(filters).every(([col, val]) => r[col] === val));
    return Promise.resolve({ data: row ?? null, error: row ? null : { message: 'no rows' } });
  });
  return builder;
}

function makeSectionWordsBuilder(rows: { section_id: string; word_id: string }[]) {
  const builder: any = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn((_column: string, value: string) => {
    const data = rows.filter((row) => row.section_id === value);
    return Promise.resolve({ data, error: null });
  });
  return builder;
}

function makeWordsBuilder(rows: Row[]) {
  const builder: any = {};
  let ids: string[] = [];
  builder.select = vi.fn(() => builder);
  builder.in = vi.fn((_column: string, values: string[]) => {
    ids = values;
    return builder;
  });
  builder.eq = vi.fn((_column: string, _value: string) => {
    const data = rows.filter((row) => ids.includes(row.id as string));
    return Promise.resolve({ data, error: null });
  });
  return builder;
}

function makeSupabaseMock(options: {
  user: { id: string } | null;
  book: Row | null;
  section: Row | null;
  sectionWords?: { section_id: string; word_id: string }[];
  words?: Row[];
}) {
  const books = makeSingleRowBuilder(options.book ? [options.book] : []);
  const sections = makeSingleRowBuilder(options.section ? [options.section] : []);
  const sectionWords = makeSectionWordsBuilder(options.sectionWords ?? []);
  const words = makeWordsBuilder(options.words ?? []);

  const from = vi.fn((table: string) => {
    switch (table) {
      case 'books':
        return books;
      case 'sections':
        return sections;
      case 'section_words':
        return sectionWords;
      case 'words':
        return words;
      default:
        throw new Error(`Unexpected table: ${table}`);
    }
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: options.user }, error: null }),
    },
    from,
    books,
    sections,
    sectionWords,
    words,
  } as any;
}

beforeEach(() => {
  mockRedirect.mockClear();
  mockNotFound.mockClear();
  mockCreateClient.mockReset();
});

describe('PracticePage', () => {
  test('shows a word whose next_review_date is in the future', async () => {
    const supabase = makeSupabaseMock({
      user: { id: 'user-1' },
      book: { id: 'book-1', user_id: 'user-1' },
      section: { id: 'section-1', book_id: 'book-1', section_number: 1, status: 'ready_to_practice' },
      sectionWords: [{ section_id: 'section-1', word_id: 'word-1' }],
      words: [
        {
          id: 'word-1',
          word: 'ephemeral',
          definition: 'lasting a short time',
          next_review_date: '2099-01-01',
        },
      ],
    });
    mockCreateClient.mockResolvedValue(supabase);

    const jsx = await PracticePage({
      params: Promise.resolve({ id: 'book-1', sectionNumber: '1' }),
    });
    render(jsx);

    // The practice page's job is "practice this section until it unlocks" —
    // it must show every word in the section regardless of due date, so a
    // word scheduled far in the future still shows up today.
    expect(screen.getByText('ephemeral')).toBeInTheDocument();
    expect(supabase.words.eq).toHaveBeenCalledWith('user_id', 'user-1');
  });

  test('redirects to the book page when the section is locked', async () => {
    const supabase = makeSupabaseMock({
      user: { id: 'user-1' },
      book: { id: 'book-1', user_id: 'user-1' },
      section: { id: 'section-1', book_id: 'book-1', section_number: 1, status: 'locked' },
    });
    mockCreateClient.mockResolvedValue(supabase);

    await expect(
      PracticePage({ params: Promise.resolve({ id: 'book-1', sectionNumber: '1' }) })
    ).rejects.toThrow('NEXT_REDIRECT:/book/book-1');

    expect(mockRedirect).toHaveBeenCalledWith('/book/book-1');
  });

  test.each(['ready_to_practice', 'ready_to_read', 'completed'])(
    'does not redirect when the section status is %s',
    async (status) => {
      const supabase = makeSupabaseMock({
        user: { id: 'user-1' },
        book: { id: 'book-1', user_id: 'user-1' },
        section: { id: 'section-1', book_id: 'book-1', section_number: 1, status },
        sectionWords: [],
        words: [],
      });
      mockCreateClient.mockResolvedValue(supabase);

      await PracticePage({ params: Promise.resolve({ id: 'book-1', sectionNumber: '1' }) });

      expect(mockRedirect).not.toHaveBeenCalled();
    }
  );
});
