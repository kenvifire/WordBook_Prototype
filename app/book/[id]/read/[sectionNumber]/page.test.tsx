import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
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
import ReadPage from './page';

const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>;

type Row = Record<string, unknown>;

function makeBooksBuilder(book: Row | null) {
  const builder: any = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.single = vi.fn(() =>
    Promise.resolve({ data: book, error: book ? null : { message: 'no rows' } })
  );
  return builder;
}

// Supports the two select shapes the read page issues against `sections`:
// select().eq('book_id', x).eq('section_number', y).single() for the
// current section, and the same filters with .maybeSingle() for the next
// section lookup.
function makeSectionsBuilder(rows: Row[]) {
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
  const resolve = () => {
    const row = rows.find((r) => Object.entries(filters).every(([col, val]) => r[col] === val));
    return Promise.resolve({ data: row ?? null, error: null });
  };
  builder.single = vi.fn(resolve);
  builder.maybeSingle = vi.fn(resolve);
  return builder;
}

function makeSupabaseMock(options: { user: { id: string } | null; book: Row | null; sections: Row[] }) {
  const books = makeBooksBuilder(options.book);
  const sections = makeSectionsBuilder(options.sections);

  const from = vi.fn((table: string) => {
    switch (table) {
      case 'books':
        return books;
      case 'sections':
        return sections;
      default:
        throw new Error(`Unexpected table: ${table}`);
    }
  });

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: options.user }, error: null }) },
    from,
    books,
    sections,
  } as any;
}

beforeEach(() => {
  mockRedirect.mockClear();
  mockNotFound.mockClear();
  mockCreateClient.mockReset();
});

describe('ReadPage prev/next navigation (I3)', () => {
  test('shows a previous-section link once past section 1, and no next-section link when there is no next section', async () => {
    const supabase = makeSupabaseMock({
      user: { id: 'user-1' },
      book: { id: 'book-1', title: 'My Book', raw_text: Array.from({ length: 10 }, () => 'word').join(' ') },
      sections: [
        { id: 'section-2', book_id: 'book-1', section_number: 2, status: 'ready_to_read', start_word_index: 0, end_word_index: 5 },
      ],
    });
    mockCreateClient.mockResolvedValue(supabase);

    const jsx = await ReadPage({ params: Promise.resolve({ id: 'book-1', sectionNumber: '2' }) });
    render(jsx);

    expect(screen.getByRole('link', { name: '← Previous section' })).toHaveAttribute(
      'href',
      '/book/book-1/read/1'
    );
    expect(screen.queryByRole('link', { name: 'Next section →' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to book' })).toHaveAttribute('href', '/book/book-1');
  });

  test('has no previous-section link on section 1', async () => {
    const supabase = makeSupabaseMock({
      user: { id: 'user-1' },
      book: { id: 'book-1', title: 'My Book', raw_text: Array.from({ length: 10 }, () => 'word').join(' ') },
      sections: [
        { id: 'section-1', book_id: 'book-1', section_number: 1, status: 'ready_to_read', start_word_index: 0, end_word_index: 5 },
      ],
    });
    mockCreateClient.mockResolvedValue(supabase);

    const jsx = await ReadPage({ params: Promise.resolve({ id: 'book-1', sectionNumber: '1' }) });
    render(jsx);

    expect(screen.queryByRole('link', { name: '← Previous section' })).not.toBeInTheDocument();
  });

  test('links next section to its practice page when it is only ready_to_practice', async () => {
    const supabase = makeSupabaseMock({
      user: { id: 'user-1' },
      book: { id: 'book-1', title: 'My Book', raw_text: Array.from({ length: 10 }, () => 'word').join(' ') },
      sections: [
        { id: 'section-1', book_id: 'book-1', section_number: 1, status: 'ready_to_read', start_word_index: 0, end_word_index: 5 },
        { id: 'section-2', book_id: 'book-1', section_number: 2, status: 'ready_to_practice', start_word_index: 5, end_word_index: 10 },
      ],
    });
    mockCreateClient.mockResolvedValue(supabase);

    const jsx = await ReadPage({ params: Promise.resolve({ id: 'book-1', sectionNumber: '1' }) });
    render(jsx);

    expect(screen.getByRole('link', { name: 'Next section →' })).toHaveAttribute(
      'href',
      '/book/book-1/practice/2'
    );
  });

  test('links next section to its read page when it is ready_to_read or completed', async () => {
    const supabase = makeSupabaseMock({
      user: { id: 'user-1' },
      book: { id: 'book-1', title: 'My Book', raw_text: Array.from({ length: 10 }, () => 'word').join(' ') },
      sections: [
        { id: 'section-1', book_id: 'book-1', section_number: 1, status: 'ready_to_read', start_word_index: 0, end_word_index: 5 },
        { id: 'section-2', book_id: 'book-1', section_number: 2, status: 'completed', start_word_index: 5, end_word_index: 10 },
      ],
    });
    mockCreateClient.mockResolvedValue(supabase);

    const jsx = await ReadPage({ params: Promise.resolve({ id: 'book-1', sectionNumber: '1' }) });
    render(jsx);

    expect(screen.getByRole('link', { name: 'Next section →' })).toHaveAttribute(
      'href',
      '/book/book-1/read/2'
    );
  });

  test('no next-section link when the next section is still locked', async () => {
    const supabase = makeSupabaseMock({
      user: { id: 'user-1' },
      book: { id: 'book-1', title: 'My Book', raw_text: Array.from({ length: 10 }, () => 'word').join(' ') },
      sections: [
        { id: 'section-1', book_id: 'book-1', section_number: 1, status: 'ready_to_read', start_word_index: 0, end_word_index: 5 },
        { id: 'section-2', book_id: 'book-1', section_number: 2, status: 'locked', start_word_index: 5, end_word_index: 10 },
      ],
    });
    mockCreateClient.mockResolvedValue(supabase);

    const jsx = await ReadPage({ params: Promise.resolve({ id: 'book-1', sectionNumber: '1' }) });
    render(jsx);

    expect(screen.queryByRole('link', { name: 'Next section →' })).not.toBeInTheDocument();
  });
});
