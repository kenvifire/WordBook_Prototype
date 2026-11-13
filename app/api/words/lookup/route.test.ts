// @vitest-environment node
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/dictionary/dictionaryApi', () => ({
  fetchDefinition: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchDefinition } from '@/lib/dictionary/dictionaryApi';
import { POST } from './route';

const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>;
const mockFetchDefinition = fetchDefinition as unknown as ReturnType<typeof vi.fn>;

type WordRow = Record<string, unknown>;

function makeWordsBuilder(existingRows: WordRow[]) {
  const table = [...existingRows];
  let filters: Record<string, unknown> = {};
  const insertedRows: WordRow[] = [];
  const updateCalls: { data: WordRow; filters: Record<string, unknown> }[] = [];

  const builder: any = {};

  builder.select = vi.fn(() => {
    filters = {};
    return builder;
  });

  builder.eq = vi.fn((column: string, value: unknown) => {
    filters = { ...filters, [column]: value };
    return builder;
  });

  builder.maybeSingle = vi.fn(() => {
    const found = table.find((row) =>
      Object.entries(filters).every(([col, val]) => row[col] === val)
    );
    return Promise.resolve({ data: found ?? null, error: null });
  });

  builder.insert = vi.fn((row: WordRow) => {
    insertedRows.push(row);
    table.push(row);
    return Promise.resolve({ error: null });
  });

  // Supports the update chain used for the null-definition retry:
  // .update({ definition }).eq('id', x).is('definition', null)
  builder.update = vi.fn((data: WordRow) => {
    let updateFilters: Record<string, unknown> = {};
    const updateBuilder: any = {};
    const applyIfMatched = () => {
      const row = table.find((r) =>
        Object.entries(updateFilters).every(([col, val]) => r[col] === val)
      );
      if (row) {
        Object.assign(row, data);
        updateCalls.push({ data, filters: { ...updateFilters } });
      }
      return Promise.resolve({ error: null });
    };
    updateBuilder.eq = vi.fn((column: string, value: unknown) => {
      updateFilters = { ...updateFilters, [column]: value };
      return updateBuilder;
    });
    updateBuilder.is = vi.fn((column: string, value: unknown) => {
      updateFilters = { ...updateFilters, [column]: value };
      return applyIfMatched();
    });
    return updateBuilder;
  });

  builder.getInsertedRows = () => insertedRows;
  builder.getUpdateCalls = () => updateCalls;
  builder.getTable = () => table;
  return builder;
}

function makeSupabaseMock(options: { user: { id: string } | null; existingRows?: WordRow[] }) {
  const words = makeWordsBuilder(options.existingRows ?? []);

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

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/words/lookup', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockCreateClient.mockReset();
  mockFetchDefinition.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('POST /api/words/lookup', () => {
  test('returns 401 when there is no authenticated user', async () => {
    const supabase = makeSupabaseMock({ user: null });
    mockCreateClient.mockResolvedValue(supabase);

    const response = await POST(makeRequest({ word: 'ephemeral' }));

    expect(response.status).toBe(401);
    expect(mockFetchDefinition).not.toHaveBeenCalled();
  });

  test('returns 400 when the word is missing or has no letters', async () => {
    const supabase = makeSupabaseMock({ user: { id: 'user-1' } });
    mockCreateClient.mockResolvedValue(supabase);

    const response = await POST(makeRequest({ word: '  123  ' }));

    expect(response.status).toBe(400);
    expect(supabase.words.insert).not.toHaveBeenCalled();
  });

  test('I4: a plain tap-to-define lookup (no add flag) fetches the definition but does not create a row', async () => {
    const supabase = makeSupabaseMock({ user: { id: 'user-1' }, existingRows: [] });
    mockCreateClient.mockResolvedValue(supabase);
    mockFetchDefinition.mockResolvedValue('lasting a short time');

    const response = await POST(makeRequest({ word: 'Ephemeral,' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockFetchDefinition).toHaveBeenCalledWith('ephemeral');
    expect(supabase.words.insert).not.toHaveBeenCalled();
    expect(body).toEqual({ word: 'ephemeral', definition: 'lasting a short time' });
  });

  test('I4: add: true on a genuinely new word looks it up and inserts it with SM-2 defaults', async () => {
    const supabase = makeSupabaseMock({ user: { id: 'user-1' }, existingRows: [] });
    mockCreateClient.mockResolvedValue(supabase);
    mockFetchDefinition.mockResolvedValue('lasting a short time');

    const response = await POST(makeRequest({ word: 'Ephemeral,', add: true }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockFetchDefinition).toHaveBeenCalledWith('ephemeral');
    expect(supabase.words.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      word: 'ephemeral',
      definition: 'lasting a short time',
      repetitions: 0,
      ease_factor: 2.5,
      interval_days: 1,
      next_review_date: '2026-01-01',
    });
    expect(body).toEqual({ word: 'ephemeral', definition: 'lasting a short time' });
  });

  test('a word the user already has returns its existing definition without inserting or re-fetching', async () => {
    const existingRows = [
      {
        id: 'word-1',
        user_id: 'user-1',
        word: 'lucid',
        definition: 'clear and easy to understand',
        repetitions: 3,
        ease_factor: 2.8,
        interval_days: 15,
      },
    ];
    const supabase = makeSupabaseMock({ user: { id: 'user-1' }, existingRows });
    mockCreateClient.mockResolvedValue(supabase);

    const response = await POST(makeRequest({ word: 'lucid' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockFetchDefinition).not.toHaveBeenCalled();
    expect(supabase.words.insert).not.toHaveBeenCalled();
    expect(body).toEqual({ word: 'lucid', definition: 'clear and easy to understand' });
  });

  test('I4: a stored null definition (a past failed lookup) is retried and backfilled without touching SRS state', async () => {
    const existingRows = [
      {
        id: 'word-1',
        user_id: 'user-1',
        word: 'zzzqaa',
        definition: null,
        repetitions: 4,
        ease_factor: 2.9,
        interval_days: 30,
        last_rating: 'easy',
      },
    ];
    const supabase = makeSupabaseMock({ user: { id: 'user-1' }, existingRows });
    mockCreateClient.mockResolvedValue(supabase);
    mockFetchDefinition.mockResolvedValue('a definition at last');

    const response = await POST(makeRequest({ word: 'zzzqaa' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockFetchDefinition).toHaveBeenCalledWith('zzzqaa');
    expect(body).toEqual({ word: 'zzzqaa', definition: 'a definition at last' });
    expect(supabase.words.insert).not.toHaveBeenCalled();

    const storedRow = supabase.words.getTable().find((row: any) => row.id === 'word-1');
    expect(storedRow).toMatchObject({
      definition: 'a definition at last',
      repetitions: 4,
      ease_factor: 2.9,
      interval_days: 30,
      last_rating: 'easy',
    });
  });

  test('I4: a stored null definition that still fails to resolve stays null and is not written', async () => {
    const existingRows = [
      { id: 'word-1', user_id: 'user-1', word: 'zzzqbb', definition: null },
    ];
    const supabase = makeSupabaseMock({ user: { id: 'user-1' }, existingRows });
    mockCreateClient.mockResolvedValue(supabase);
    mockFetchDefinition.mockResolvedValue(null);

    const response = await POST(makeRequest({ word: 'zzzqbb' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ word: 'zzzqbb', definition: null });
    expect(supabase.words.getUpdateCalls()).toHaveLength(0);
  });
});
