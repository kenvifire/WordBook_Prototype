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

    // fetchDefinition never rejects, but each call is wrapped defensively so one
    // word's dictionary failure can never abort the rest of the batch.
    const definitions = await Promise.all(
      candidateWords.map((word) => fetchDefinition(word).catch(() => null))
    );

    const wordRows = candidateWords.map((word, index) => ({
      user_id: userId,
      word,
      definition: definitions[index],
      book_id: bookId,
      // SM-2 columns (repetitions, ease_factor, interval_days, next_review_date) are
      // intentionally omitted: on conflict (user_id, word) Supabase only overwrites
      // the columns present in this payload, so an existing word's SRS state is left
      // untouched. The table's own defaults apply only on a brand-new insert.
    }));

    const { data: upsertedWords, error: wordsError } = await supabase
      .from('words')
      .upsert(wordRows, { onConflict: 'user_id,word' })
      .select('id, word');

    assertNoError(wordsError, 'Failed to upsert words');
    if (!upsertedWords) {
      throw new Error('Failed to upsert words: no rows returned');
    }

    const sectionWordRows = (upsertedWords as { id: string; word: string }[]).map((row) => ({
      section_id: sectionId,
      word_id: row.id,
    }));

    if (sectionWordRows.length === 0) continue;

    const { error: sectionWordsError } = await supabase
      .from('section_words')
      .insert(sectionWordRows);

    assertNoError(sectionWordsError, 'Failed to link section words');
  }

  return { bookId };
}
