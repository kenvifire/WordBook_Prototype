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

function makeWordsBuilder() {
  let capturedRows: any[] = [];
  let capturedOptions: any;
  const builder: any = {};
  builder.upsert = vi.fn((rows: any[], options: any) => {
    capturedRows = rows;
    capturedOptions = options;
    return builder;
  });
  builder.select = vi.fn(() => builder);
  builder.then = (resolve: any, reject: any) =>
    Promise.resolve({
      data: capturedRows.map((row, index) => ({ id: `word-id-${index}`, word: row.word })),
      error: null,
    }).then(resolve, reject);
  builder.getCapturedOptions = () => capturedOptions;
  return builder;
}

function makeSectionWordsBuilder() {
  const builder: any = {};
  builder.insert = vi.fn(() => builder);
  builder.then = (resolve: any, reject: any) => Promise.resolve({ error: null }).then(resolve, reject);
  return builder;
}

function createSupabaseMock(booksResult: QueryResult = { data: { id: 'book-1' }, error: null }) {
  const books = makeBooksBuilder(booksResult);
  const sections = makeSectionsBuilder();
  const words = makeWordsBuilder();
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

  test('extracted words are upserted against the existing (user_id, word) row, not duplicated', async () => {
    const supabase = createSupabaseMock();
    const candidateWords = Array.from({ length: 150 }, (_, i) => uniqueWord(i));
    const rawText = candidateWords.join(' ');

    await addBook(supabase, {
      title: 'Vocab Book',
      format: 'text',
      rawText,
      userId: 'user-1',
    });

    expect(supabase.words.upsert).toHaveBeenCalledTimes(1);
    const [rows, options] = supabase.words.upsert.mock.calls[0];
    expect(options).toEqual({ onConflict: 'user_id,word' });
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

    expect(supabase.words.upsert).toHaveBeenCalledTimes(1);
    const rows = supabase.words.upsert.mock.calls[0][0];
    expect(rows).toHaveLength(5);
    const failedRow = rows.find((row: any) => row.word === word2);
    expect(failedRow.definition).toBeNull();
    const okRow = rows.find((row: any) => row.word === word0);
    expect(okRow.definition).toBe(`definition for ${word0}`);
  });
});
