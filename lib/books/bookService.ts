import type { SupabaseClient } from '@supabase/supabase-js';
import { splitIntoSections } from '@/lib/text/sectionize';
import { extractVocabulary } from '@/lib/text/extractVocabulary';
import { fetchDefinition } from '@/lib/dictionary/dictionaryApi';

export type AddBookInput = {
  title: string;
  author?: string;
  format: 'text' | 'epub';
  rawText: string;
  userId: string;
};

export type AddBookResult = {
  bookId: string;
};

function assertNoError(error: { message: string } | null, context: string): void {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

// I6: a section's new words were previously all looked up via one unbounded
// Promise.all, so a long section could fire thousands of simultaneous
// dictionary requests. This runs at most `limit` fetchDefinition calls
// concurrently via a small worker-pool loop, preserving each word's result
// at its original index.
const DICTIONARY_CONCURRENCY = 5;

async function fetchDefinitionsWithLimit(
  words: string[],
  limit: number = DICTIONARY_CONCURRENCY
): Promise<(string | null)[]> {
  const results: (string | null)[] = new Array(words.length).fill(null);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= words.length) return;
      // fetchDefinition never rejects, but each call is still wrapped
      // defensively so one word's dictionary failure can never abort the
      // rest of the batch.
      results[index] = await fetchDefinition(words[index]).catch(() => null);
    }
  }

  const workerCount = Math.min(limit, words.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

export async function addBook(
  supabase: SupabaseClient,
  input: AddBookInput
): Promise<AddBookResult> {
  const { title, author, format, rawText, userId } = input;

  const { data: book, error: bookError } = await supabase
    .from('books')
    .insert({
      user_id: userId,
      title,
      author: author ?? null,
      format,
      raw_text: rawText,
    })
    .select('id')
    .single();

  assertNoError(bookError, 'Failed to create book');
  if (!book) {
    throw new Error('Failed to create book: no row returned');
  }

  const bookId = book.id as string;
  const sections = splitIntoSections(rawText);

  if (sections.length === 0) {
    return { bookId };
  }

  const { data: insertedSections, error: sectionsError } = await supabase
    .from('sections')
    .insert(
      sections.map((section) => ({
        book_id: bookId,
        section_number: section.sectionNumber,
        start_word_index: section.startWordIndex,
        end_word_index: section.endWordIndex,
        status: section.sectionNumber === 1 ? 'ready_to_practice' : 'locked',
      }))
    )
    .select('id, section_number');

  assertNoError(sectionsError, 'Failed to create sections');
  if (!insertedSections) {
    throw new Error('Failed to create sections: no rows returned');
  }

  const sectionIdByNumber = new Map<number, string>();
  for (const row of insertedSections as { id: string; section_number: number }[]) {
    sectionIdByNumber.set(row.section_number, row.id);
  }

  for (const section of sections) {
    const sectionId = sectionIdByNumber.get(section.sectionNumber);
    if (!sectionId) continue;

    const candidateWords = extractVocabulary(section.text);
    if (candidateWords.length === 0) continue;

    // Select-first: find which candidate words already exist for this user so we
    // never touch their stored definition/book_id (an upsert would overwrite both
    // columns on an existing row, even when the new lookup fails or belongs to a
    // different book) and so we only call the dictionary API for genuinely new words.
    const { data: existingWords, error: existingWordsError } = await supabase
      .from('words')
      .select('id, word')
      .eq('user_id', userId)
      .in('word', candidateWords);

    assertNoError(existingWordsError, 'Failed to look up existing words');

    const existingWordIdByWord = new Map<string, string>();
    for (const row of (existingWords ?? []) as { id: string; word: string }[]) {
      existingWordIdByWord.set(row.word, row.id);
    }

    const newWords = candidateWords.filter((word) => !existingWordIdByWord.has(word));

    const definitions = await fetchDefinitionsWithLimit(newWords);

    const newWordRows = newWords.map((word, index) => ({
      user_id: userId,
      word,
      definition: definitions[index],
      book_id: bookId,
      // SM-2 columns (repetitions, ease_factor, interval_days, next_review_date) are
      // intentionally omitted so the table's defaults apply; this is a plain insert
      // of brand-new rows only, so there is no conflict and no risk of overwriting
      // an existing word's SRS state, definition, or book_id.
    }));

    let newWordIdByWord = new Map<string, string>();
    if (newWordRows.length > 0) {
      const { data: insertedWords, error: wordsError } = await supabase
        .from('words')
        .insert(newWordRows)
        .select('id, word');

      assertNoError(wordsError, 'Failed to insert new words');
      if (!insertedWords) {
        throw new Error('Failed to insert new words: no rows returned');
      }

      newWordIdByWord = new Map(
        (insertedWords as { id: string; word: string }[]).map((row) => [row.word, row.id])
      );
    }

    const sectionWordRows = candidateWords.map((word) => ({
      section_id: sectionId,
      word_id: existingWordIdByWord.get(word) ?? newWordIdByWord.get(word),
    }));

    if (sectionWordRows.length === 0) continue;

    const { error: sectionWordsError } = await supabase
      .from('section_words')
      .insert(sectionWordRows);

    assertNoError(sectionWordsError, 'Failed to link section words');
  }

  return { bookId };
}
