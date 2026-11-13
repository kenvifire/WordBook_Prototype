import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/dictionary/dictionaryApi', () => ({
  fetchDefinition: vi.fn(),
}));

import { fetchDefinition } from '@/lib/dictionary/dictionaryApi';
import { addBook } from './bookService';

const mockFetchDefinition = fetchDefinition as unknown as ReturnType<typeof vi.fn>;

// extractVocabulary tokenizes on [a-zA-Z']+, so digits in a word (e.g. "word0")
// get stripped and collapse distinct tokens together. Use letters-only suffixes
// (prefixed so they can't collide with any of the 1000 common words) to get
// genuinely distinct, non-common vocabulary candidates.
function uniqueWord(i: number): string {
  const first = String.fromCharCode(97 + Math.floor(i / 26));
  const second = String.fromCharCode(97 + (i % 26));
  return `zzzq${first}${second}`;
}

type QueryResult = { data?: unknown; error?: { message: string } | null };

function makeBooksBuilder(result: QueryResult) {
  const builder: any = {};
  builder.insert = vi.fn(() => builder);
  builder.select = vi.fn(() => builder);
  builder.single = vi.fn(() => Promise.resolve(result));
  return builder;
}

function makeSectionsBuilder() {
  let capturedRows: any[] = [];
  const builder: any = {};
  builder.insert = vi.fn((rows: any[]) => {
    capturedRows = rows;
    return builder;
  });
  builder.select = vi.fn(() => builder);
  builder.then = (resolve: any, reject: any) =>
    Promise.resolve({
      data: capturedRows.map((row, index) => ({ id: `section-id-${index}`, section_number: row.section_number })),
      error: null,
    }).then(resolve, reject);
  return builder;
}

// Simulates the `words` table: existing rows are seeded up front (as they'd
// already be in the DB), `select().eq().in()` looks them up, and `insert()`
// only ever creates genuinely new rows (seeded rows are never passed to insert
// by production code, but we still refuse to "insert" a word already present,
// to catch any regression back to upserting over existing rows).
function makeWordsBuilder(existingRows: any[] = []) {
  const table = [...existingRows];
  let capturedInsertRows: any[] = [];
  let capturedSelectFilter: { userId?: string; words?: string[] } = {};

  const builder: any = {};

  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn((_column: string, value: string) => {
    capturedSelectFilter.userId = value;
    return builder;
  });
  builder.in = vi.fn((_column: string, values: string[]) => {
    capturedSelectFilter.words = values;
    const data = table.filter(
      (row) => row.user_id === capturedSelectFilter.userId && values.includes(row.word)
    );
    return Promise.resolve({ data, error: null });
  });

  builder.insert = vi.fn((rows: any[]) => {
    capturedInsertRows = rows;
    return builder;
  });
  builder.then = (resolve: any, reject: any) => {
    const data = capturedInsertRows.map((row, index) => {
      const newRow = { id: `word-id-${index}`, ...row };
      table.push(newRow);
      return { id: newRow.id, word: newRow.word };
    });
    return Promise.resolve({ data, error: null }).then(resolve, reject);
  };

  builder.getCapturedInsertRows = () => capturedInsertRows;
  builder.getTable = () => table;
  return builder;
}

function makeSectionWordsBuilder() {
  const builder: any = {};
  builder.insert = vi.fn(() => builder);
  builder.then = (resolve: any, reject: any) => Promise.resolve({ error: null }).then(resolve, reject);
  return builder;
}

function createSupabaseMock(
  booksResult: QueryResult = { data: { id: 'book-1' }, error: null },
  existingWords: any[] = []
) {
  const books = makeBooksBuilder(booksResult);
  const sections = makeSectionsBuilder();
  const words = makeWordsBuilder(existingWords);
  const sectionWords = makeSectionWordsBuilder();

  const from = vi.fn((table: string) => {
    switch (table) {
      case 'books':
        return books;
      case 'sections':
        return sections;
      case 'words':
        return words;
      case 'section_words':
        return sectionWords;
      default:
        throw new Error(`Unexpected table: ${table}`);
    }
  });

  return { from, books, sections, words, sectionWords } as any;
}

beforeEach(() => {
  mockFetchDefinition.mockReset();
  mockFetchDefinition.mockResolvedValue('a definition');
});

describe('addBook', () => {
  test('creates one section per 150 words and marks only section 1 ready_to_practice', async () => {
    const supabase = createSupabaseMock();
    // 320 common words -> extractVocabulary yields no candidate words, so no
    // words/section_words calls happen; we're only asserting section shape here.
    const rawText = Array.from({ length: 320 }, () => 'the').join(' ');

    const result = await addBook(supabase, {
      title: 'Common Words Book',
      format: 'text',
      rawText,
      userId: 'user-1',
    });

    expect(result).toEqual({ bookId: 'book-1' });
    expect(supabase.sections.insert).toHaveBeenCalledTimes(1);
    const insertedSections = supabase.sections.insert.mock.calls[0][0];
    expect(insertedSections).toHaveLength(3);
    expect(insertedSections[0]).toMatchObject({
      book_id: 'book-1',
      section_number: 1,
      start_word_index: 0,
      end_word_index: 150,
      status: 'ready_to_practice',
    });
    expect(insertedSections[1]).toMatchObject({ section_number: 2, status: 'locked' });
    expect(insertedSections[2]).toMatchObject({ section_number: 3, status: 'locked' });
  });

  test('extracted words are inserted once and linked, not duplicated', async () => {
    const supabase = createSupabaseMock();
    const candidateWords = Array.from({ length: 150 }, (_, i) => uniqueWord(i));
    const rawText = candidateWords.join(' ');

    await addBook(supabase, {
      title: 'Vocab Book',
      format: 'text',
      rawText,
      userId: 'user-1',
    });

    expect(supabase.words.insert).toHaveBeenCalledTimes(1);
    const rows = supabase.words.insert.mock.calls[0][0];
    expect(rows).toHaveLength(150);
    for (const row of rows) {
      expect(row).toMatchObject({ user_id: 'user-1', book_id: 'book-1' });
      expect(row).not.toHaveProperty('repetitions');
      expect(row).not.toHaveProperty('ease_factor');
      expect(row).not.toHaveProperty('interval_days');
      expect(row).not.toHaveProperty('next_review_date');
    }
    expect(supabase.sectionWords.insert).toHaveBeenCalledTimes(1);
    const sectionWordRows = supabase.sectionWords.insert.mock.calls[0][0];
    expect(sectionWordRows).toHaveLength(150);
  });

  test('a dictionary lookup failure for one word does not abort the rest of the book add', async () => {
    const supabase = createSupabaseMock();
    const candidateWords = Array.from({ length: 5 }, (_, i) => uniqueWord(i));
    const [word0, , word2] = candidateWords;
    const rawText = candidateWords.join(' ');

    mockFetchDefinition.mockImplementation((word: string) => {
      if (word === word2) {
        return Promise.reject(new Error('dictionary API down'));
      }
      return Promise.resolve(`definition for ${word}`);
    });

    await expect(
      addBook(supabase, {
        title: 'Flaky Dictionary Book',
        format: 'text',
        rawText,
        userId: 'user-1',
      })
    ).resolves.toEqual({ bookId: 'book-1' });

    expect(supabase.words.insert).toHaveBeenCalledTimes(1);
    const rows = supabase.words.insert.mock.calls[0][0];
    expect(rows).toHaveLength(5);
    const failedRow = rows.find((row: any) => row.word === word2);
    expect(failedRow.definition).toBeNull();
    const okRow = rows.find((row: any) => row.word === word0);
    expect(okRow.definition).toBe(`definition for ${word0}`);
  });

  test('re-extracting an existing word in a new book leaves its saved definition and book_id untouched', async () => {
    // Regression test for the upsert data-loss bug: an existing word's
    // definition/book_id must never be overwritten by a later book-add that
    // happens to re-extract the same word, even if that later lookup fails or
    // the word now also appears in a different book.
    const existingWord = uniqueWord(0);
    const newWord = uniqueWord(1);
    const existingWords = [
      {
        id: 'existing-word-id',
        user_id: 'user-1',
        word: existingWord,
        definition: 'the original good definition',
        book_id: 'original-book-id',
      },
    ];
    const supabase = createSupabaseMock(
      { data: { id: 'book-2' }, error: null },
      existingWords
    );

    // The dictionary lookup fails this time around; if the existing word were
    // re-upserted, its good definition would get wiped out with null.
    mockFetchDefinition.mockImplementation((word: string) => {
      if (word === existingWord) {
        return Promise.reject(new Error('dictionary API down'));
      }
      return Promise.resolve(`definition for ${word}`);
    });

    const rawText = [existingWord, newWord].join(' ');

    const result = await addBook(supabase, {
      title: 'Second Book',
      format: 'text',
      rawText,
      userId: 'user-1',
    });

    expect(result).toEqual({ bookId: 'book-2' });

    // Only the new word gets inserted; the existing word is never passed to insert.
    expect(supabase.words.insert).toHaveBeenCalledTimes(1);
    const insertedRows = supabase.words.insert.mock.calls[0][0];
    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0]).toMatchObject({ word: newWord });
    expect(insertedRows.some((row: any) => row.word === existingWord)).toBe(false);

    // fetchDefinition is never called for the already-existing word.
    expect(mockFetchDefinition).not.toHaveBeenCalledWith(existingWord);

    // The existing word's stored row is untouched: same definition, same book_id.
    const storedExistingRow = supabase.words
      .getTable()
      .find((row: any) => row.word === existingWord);
    expect(storedExistingRow).toMatchObject({
      id: 'existing-word-id',
      definition: 'the original good definition',
      book_id: 'original-book-id',
    });

    // Both words are still linked into the new book's section.
    expect(supabase.sectionWords.insert).toHaveBeenCalledTimes(1);
    const sectionWordRows = supabase.sectionWords.insert.mock.calls[0][0];
    expect(sectionWordRows).toHaveLength(2);
    expect(sectionWordRows.map((row: any) => row.word_id).sort()).toEqual(
      ['existing-word-id', 'word-id-0'].sort()
    );
  });

  test('I6: caps concurrent dictionary lookups at 5 instead of firing a section\'s lookups all at once', async () => {
    const supabase = createSupabaseMock();
    const candidateWords = Array.from({ length: 12 }, (_, i) => uniqueWord(i));
    const rawText = candidateWords.join(' ');

    let inFlight = 0;
    let maxInFlight = 0;
    const pendingResolvers: Array<() => void> = [];

    mockFetchDefinition.mockImplementation((word: string) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      return new Promise<string>((resolve) => {
        pendingResolvers.push(() => {
          inFlight -= 1;
          resolve(`definition for ${word}`);
        });
      });
    });

    async function flush(times = 10) {
      for (let i = 0; i < times; i++) {
        await Promise.resolve();
      }
    }

    const addPromise = addBook(supabase, {
      title: 'Big Vocab Book',
      format: 'text',
      rawText,
      userId: 'user-1',
    });

    // Resolve lookups one at a time, flushing microtasks in between so the
    // next worker in the pool (if any word is left) gets to start before we
    // check the high-water mark again.
    let resolvedCount = 0;
    for (let guard = 0; guard < candidateWords.length * 2 && resolvedCount < candidateWords.length; guard++) {
      await flush();
      const resolve = pendingResolvers.shift();
      if (!resolve) continue;
      resolve();
      resolvedCount += 1;
    }

    await flush();
    await addPromise;

    expect(mockFetchDefinition).toHaveBeenCalledTimes(12);
    expect(maxInFlight).toBeGreaterThan(0);
    expect(maxInFlight).toBeLessThanOrEqual(5);
  });
});
