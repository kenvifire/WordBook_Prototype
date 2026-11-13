// @vitest-environment node
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/sections/sectionService', () => ({
  maybeUnlockNextSection: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { maybeUnlockNextSection } from '@/lib/sections/sectionService';
import { POST } from './route';

const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>;
const mockMaybeUnlockNextSection = maybeUnlockNextSection as unknown as ReturnType<typeof vi.fn>;

type WordRow = Record<string, unknown>;

function makeWordsBuilder(row: WordRow | null) {
  const table = row ? [{ ...row }] : [];
  let mode: 'select' | 'update' = 'select';
  let filters: Record<string, unknown> = {};
  let pendingUpdate: Record<string, unknown> = {};

  const builder: any = {};

  builder.select = vi.fn(() => {
    mode = 'select';
    filters = {};
    return builder;
  });

  builder.update = vi.fn((data: Record<string, unknown>) => {
    mode = 'update';
    pendingUpdate = data;
    filters = {};
    return builder;
  });

  builder.eq = vi.fn((column: string, value: unknown) => {
    filters = { ...filters, [column]: value };
    if (mode === 'update') {
      const found = table.find((r) =>
        Object.entries(filters).every(([col, val]) => r[col] === val)
      );
      if (found) {
        Object.assign(found, pendingUpdate);
      }
      return Promise.resolve({ error: null });
    }
    return builder;
  });

  builder.single = vi.fn(() => {
    const found = table.find((r) => Object.entries(filters).every(([col, val]) => r[col] === val));
    return Promise.resolve({ data: found ?? null, error: found ? null : { message: 'no rows' } });
  });

  builder.getTable = () => table;
  return builder;
}

function makeSectionWordsBuilder(rows: { section_id: string; word_id: string }[]) {
  const builder: any = {};
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn((_column: string, value: string) => {
    const data = rows.filter((row) => row.word_id === value);
    return Promise.resolve({ data, error: null });
  });
  return builder;
}

function makeSupabaseMock(options: {
  user: { id: string } | null;
  wordRow: WordRow | null;
  sectionWords?: { section_id: string; word_id: string }[];
}) {
  const words = makeWordsBuilder(options.wordRow);
  const sectionWords = makeSectionWordsBuilder(options.sectionWords ?? []);

  const from = vi.fn((table: string) => {
    switch (table) {
      case 'words':
        return words;
      case 'section_words':
        return sectionWords;
      default:
        throw new Error(`Unexpected table: ${table}`);
    }
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: options.user }, error: null }),
    },
    from,
    words,
    sectionWords,
  } as any;
}

function makeRequest(wordId: string, body: unknown) {
  return new NextRequest(`http://localhost/api/words/${wordId}/rate`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockCreateClient.mockReset();
  mockMaybeUnlockNextSection.mockReset();
  // applyRating's nextReviewDate is derived from `new Date()` inside the
  // route, so the system clock is pinned for deterministic assertions.
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('POST /api/words/[wordId]/rate', () => {
  test('applies the rating via applyRating, persists the new state, and triggers unlock checks', async () => {
    const wordRow = {
      id: 'word-1',
      user_id: 'user-1',
      word: 'ephemeral',
      definition: 'lasting a short time',
      book_id: 'book-1',
      repetitions: 2,
      ease_factor: 2.0,
      interval_days: 10,
      next_review_date: '2026-01-01',
      last_rating: 'good',
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const supabase = makeSupabaseMock({
      user: { id: 'user-1' },
      wordRow,
      sectionWords: [
        { section_id: 'section-1', word_id: 'word-1' },
        { section_id: 'section-2', word_id: 'word-1' },
      ],
    });
    mockCreateClient.mockResolvedValue(supabase);

    const response = await POST(makeRequest('word-1', { rating: 'good' }), {
      params: Promise.resolve({ wordId: 'word-1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(supabase.words.update).toHaveBeenCalledWith({
      repetitions: 3,
      ease_factor: 2.0,
      interval_days: 20,
      next_review_date: '2026-01-21',
      last_rating: 'good',
    });
    expect(body).toMatchObject({
      id: 'word-1',
      repetitions: 3,
      ease_factor: 2.0,
      interval_days: 20,
      next_review_date: '2026-01-21',
      last_rating: 'good',
    });

    expect(mockMaybeUnlockNextSection).toHaveBeenCalledTimes(2);
    expect(mockMaybeUnlockNextSection).toHaveBeenCalledWith(supabase, 'section-1');
    expect(mockMaybeUnlockNextSection).toHaveBeenCalledWith(supabase, 'section-2');
  });

  test('rating an unknown wordId returns 404', async () => {
    const supabase = makeSupabaseMock({ user: { id: 'user-1' }, wordRow: null });
    mockCreateClient.mockResolvedValue(supabase);

    const response = await POST(makeRequest('missing-word', { rating: 'good' }), {
      params: Promise.resolve({ wordId: 'missing-word' }),
    });

    expect(response.status).toBe(404);
    expect(supabase.words.update).not.toHaveBeenCalled();
    expect(mockMaybeUnlockNextSection).not.toHaveBeenCalled();
  });

  test('returns 401 when there is no authenticated user', async () => {
    const supabase = makeSupabaseMock({ user: null, wordRow: null });
    mockCreateClient.mockResolvedValue(supabase);

    const response = await POST(makeRequest('word-1', { rating: 'good' }), {
      params: Promise.resolve({ wordId: 'word-1' }),
    });

    expect(response.status).toBe(401);
    expect(supabase.words.update).not.toHaveBeenCalled();
  });

  test('rejects an invalid rating with 400 before touching the word', async () => {
    const wordRow = {
      id: 'word-1',
      user_id: 'user-1',
      word: 'ephemeral',
      definition: 'lasting a short time',
      book_id: 'book-1',
      repetitions: 2,
      ease_factor: 2.0,
      interval_days: 10,
      next_review_date: '2026-01-01',
      last_rating: 'good',
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const supabase = makeSupabaseMock({ user: { id: 'user-1' }, wordRow });
    mockCreateClient.mockResolvedValue(supabase);

    const response = await POST(makeRequest('word-1', { rating: 'excellent' }), {
      params: Promise.resolve({ wordId: 'word-1' }),
    });

    expect(response.status).toBe(400);
    expect(supabase.words.update).not.toHaveBeenCalled();
    expect(mockMaybeUnlockNextSection).not.toHaveBeenCalled();
  });

  test('still returns the successful word update when the unlock check throws', async () => {
    const wordRow = {
      id: 'word-1',
      user_id: 'user-1',
      word: 'ephemeral',
      definition: 'lasting a short time',
      book_id: 'book-1',
      repetitions: 2,
      ease_factor: 2.0,
      interval_days: 10,
      next_review_date: '2026-01-01',
      last_rating: 'good',
      created_at: '2026-01-01T00:00:00.000Z',
    };
    const supabase = makeSupabaseMock({
      user: { id: 'user-1' },
      wordRow,
      sectionWords: [{ section_id: 'section-1', word_id: 'word-1' }],
    });
    mockCreateClient.mockResolvedValue(supabase);
    mockMaybeUnlockNextSection.mockRejectedValue(new Error('boom'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await POST(makeRequest('word-1', { rating: 'good' }), {
      params: Promise.resolve({ wordId: 'word-1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(supabase.words.update).toHaveBeenCalledTimes(1);
    expect(body).toMatchObject({ id: 'word-1', repetitions: 3 });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
