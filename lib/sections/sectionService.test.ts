import { describe, test, expect, vi } from 'vitest';
import { computeRecognitionRate, maybeUnlockNextSection } from './sectionService';

describe('computeRecognitionRate', () => {
  test('rate is the fraction of words last rated good or easy', () => {
    const words = [
      { lastRating: 'good' },
      { lastRating: 'easy' },
      { lastRating: 'again' },
      { lastRating: null },
    ];
    expect(computeRecognitionRate(words)).toBe(0.5);
  });

  test('a section with zero words auto-passes at 1.0', () => {
    expect(computeRecognitionRate([])).toBe(1);
  });

  test('79% does not meet the 80% threshold, 80% exactly does', () => {
    const near = Array.from({ length: 100 }, (_, i) => ({ lastRating: i < 79 ? 'good' : 'again' }));
    expect(computeRecognitionRate(near) >= 0.8).toBe(false);
    const exact = Array.from({ length: 100 }, (_, i) => ({ lastRating: i < 80 ? 'good' : 'again' }));
    expect(computeRecognitionRate(exact) >= 0.8).toBe(true);
  });
});

// Mock chain for the `sections` table: supports the two select shapes
// maybeUnlockNextSection issues (`select().eq('id', x).single()` and
// `select().eq('book_id', x).eq('section_number', y).maybeSingle()`) plus
// `update(data).eq('id', x)`, backed by an in-memory row array so assertions
// can check the stored status after the call, mirroring the chain-mocking
// style already used in lib/books/bookService.test.ts.
function makeSectionsBuilder(initialRows: Record<string, unknown>[]) {
  const table = initialRows.map((row) => ({ ...row }));
  let filters: Record<string, unknown> = {};
  let mode: 'select' | 'update' = 'select';
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
      const row = table.find((r) =>
        Object.entries(filters).every(([col, val]) => r[col] === val)
      );
      if (row) {
        Object.assign(row, pendingUpdate);
      }
      return Promise.resolve({ error: null });
    }
    return builder;
  });

  const resolveSelect = () => {
    const row = table.find((r) => Object.entries(filters).every(([col, val]) => r[col] === val));
    return Promise.resolve({ data: row ?? null, error: null });
  };

  builder.single = vi.fn(resolveSelect);
  builder.maybeSingle = vi.fn(resolveSelect);

  builder.getTable = () => table;
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

function makeWordsBuilder(rows: { id: string; last_rating: string | null }[]) {
  const builder: any = {};
  builder.select = vi.fn(() => builder);
  builder.in = vi.fn((_column: string, values: string[]) => {
    const data = rows.filter((row) => values.includes(row.id));
    return Promise.resolve({ data, error: null });
  });
  return builder;
}

function createSupabaseMock(options: {
  sections: Record<string, unknown>[];
  sectionWords: { section_id: string; word_id: string }[];
  words: { id: string; last_rating: string | null }[];
}) {
  const sections = makeSectionsBuilder(options.sections);
  const sectionWords = makeSectionWordsBuilder(options.sectionWords);
  const words = makeWordsBuilder(options.words);

  const from = vi.fn((table: string) => {
    switch (table) {
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

  return { from, sections, sectionWords, words } as any;
}

describe('maybeUnlockNextSection', () => {
  test('unlocks reading for this section and practice for the next when the rate crosses 80%', async () => {
    const supabase = createSupabaseMock({
      sections: [
        { id: 'section-1', book_id: 'book-1', section_number: 1, status: 'ready_to_practice' },
        { id: 'section-2', book_id: 'book-1', section_number: 2, status: 'locked' },
      ],
      sectionWords: [
        { section_id: 'section-1', word_id: 'w1' },
        { section_id: 'section-1', word_id: 'w2' },
        { section_id: 'section-1', word_id: 'w3' },
        { section_id: 'section-1', word_id: 'w4' },
        { section_id: 'section-1', word_id: 'w5' },
      ],
      words: [
        { id: 'w1', last_rating: 'good' },
        { id: 'w2', last_rating: 'good' },
        { id: 'w3', last_rating: 'good' },
        { id: 'w4', last_rating: 'easy' },
        { id: 'w5', last_rating: 'again' },
      ],
    });

    await maybeUnlockNextSection(supabase, 'section-1');

    expect(supabase.sections.update).toHaveBeenCalledTimes(2);
    expect(supabase.sections.update.mock.calls[0][0]).toEqual({ status: 'ready_to_read' });
    expect(supabase.sections.update.mock.calls[1][0]).toEqual({ status: 'ready_to_practice' });

    const rows = supabase.sections.getTable();
    expect(rows.find((r: any) => r.id === 'section-1').status).toBe('ready_to_read');
    expect(rows.find((r: any) => r.id === 'section-2').status).toBe('ready_to_practice');
  });

  test('does nothing when the rate is below 80%', async () => {
    const supabase = createSupabaseMock({
      sections: [
        { id: 'section-1', book_id: 'book-1', section_number: 1, status: 'ready_to_practice' },
        { id: 'section-2', book_id: 'book-1', section_number: 2, status: 'locked' },
      ],
      sectionWords: [
        { section_id: 'section-1', word_id: 'w1' },
        { section_id: 'section-1', word_id: 'w2' },
        { section_id: 'section-1', word_id: 'w3' },
        { section_id: 'section-1', word_id: 'w4' },
        { section_id: 'section-1', word_id: 'w5' },
      ],
      words: [
        { id: 'w1', last_rating: 'good' },
        { id: 'w2', last_rating: 'good' },
        { id: 'w3', last_rating: 'again' },
        { id: 'w4', last_rating: 'again' },
        { id: 'w5', last_rating: 'again' },
      ],
    });

    await maybeUnlockNextSection(supabase, 'section-1');

    expect(supabase.sections.update).not.toHaveBeenCalled();
    const rows = supabase.sections.getTable();
    expect(rows.find((r: any) => r.id === 'section-1').status).toBe('ready_to_practice');
    expect(rows.find((r: any) => r.id === 'section-2').status).toBe('locked');
  });

  test('does not relock or re-unlock a section that is already ready_to_read/completed', async () => {
    const supabase = createSupabaseMock({
      sections: [
        { id: 'section-1', book_id: 'book-1', section_number: 1, status: 'ready_to_read' },
        { id: 'section-2', book_id: 'book-1', section_number: 2, status: 'ready_to_practice' },
      ],
      sectionWords: [
        { section_id: 'section-1', word_id: 'w1' },
        { section_id: 'section-1', word_id: 'w2' },
      ],
      words: [
        { id: 'w1', last_rating: 'good' },
        { id: 'w2', last_rating: 'easy' },
      ],
    });

    await maybeUnlockNextSection(supabase, 'section-1');

    expect(supabase.sections.update).not.toHaveBeenCalled();
    const rows = supabase.sections.getTable();
    expect(rows.find((r: any) => r.id === 'section-1').status).toBe('ready_to_read');
    expect(rows.find((r: any) => r.id === 'section-2').status).toBe('ready_to_practice');
  });

  test('a section with zero vocabulary words auto-unlocks the next section', async () => {
    const supabase = createSupabaseMock({
      sections: [
        { id: 'section-1', book_id: 'book-1', section_number: 1, status: 'ready_to_practice' },
        { id: 'section-2', book_id: 'book-1', section_number: 2, status: 'locked' },
      ],
      sectionWords: [],
      words: [],
    });

    await maybeUnlockNextSection(supabase, 'section-1');

    expect(supabase.words.in).not.toHaveBeenCalled();
    const rows = supabase.sections.getTable();
    expect(rows.find((r: any) => r.id === 'section-1').status).toBe('ready_to_read');
    expect(rows.find((r: any) => r.id === 'section-2').status).toBe('ready_to_practice');
  });

  test('does not touch the next section when there is no next section', async () => {
    const supabase = createSupabaseMock({
      sections: [
        { id: 'section-1', book_id: 'book-1', section_number: 1, status: 'ready_to_practice' },
      ],
      sectionWords: [{ section_id: 'section-1', word_id: 'w1' }],
      words: [{ id: 'w1', last_rating: 'good' }],
    });

    await maybeUnlockNextSection(supabase, 'section-1');

    expect(supabase.sections.update).toHaveBeenCalledTimes(1);
    expect(supabase.sections.update.mock.calls[0][0]).toEqual({ status: 'ready_to_read' });
  });
});
