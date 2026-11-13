import type { SupabaseClient } from '@supabase/supabase-js';

export type WordForRecognition = {
  lastRating: string | null;
};

const UNLOCK_THRESHOLD = 0.8;

// Statuses at or past "ready_to_read" in the per-section progression. A
// section already here must never be relocked or re-unlocked by a later
// rating that happens to cross the threshold again.
const PAST_READY_TO_READ = new Set(['ready_to_read', 'completed']);

export function computeRecognitionRate(words: WordForRecognition[]): number {
  // Review Focus #5: a section with zero vocabulary words (e.g. every word in
  // it was a common word, dropped during extraction) auto-passes rather than
  // dividing by zero.
  if (words.length === 0) {
    return 1;
  }
  const recognized = words.filter(
    (word) => word.lastRating === 'good' || word.lastRating === 'easy'
  ).length;
  return recognized / words.length;
}

function assertNoError(error: { message: string } | null, context: string): void {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

type SectionRow = {
  id: string;
  book_id: string;
  section_number: number;
  status: string;
};

export async function maybeUnlockNextSection(
  supabase: SupabaseClient,
  sectionId: string
): Promise<void> {
  const { data: section, error: sectionError } = await supabase
    .from('sections')
    .select('id, book_id, section_number, status')
    .eq('id', sectionId)
    .single();

  assertNoError(sectionError, 'Failed to load section');
  if (!section) {
    throw new Error('Failed to load section: no row returned');
  }

  const { id: currentSectionId, book_id: bookId, section_number: sectionNumber, status } =
    section as SectionRow;

  const { data: sectionWordRows, error: sectionWordsError } = await supabase
    .from('section_words')
    .select('word_id')
    .eq('section_id', currentSectionId);

  assertNoError(sectionWordsError, 'Failed to load section words');

  const wordIds = ((sectionWordRows ?? []) as { word_id: string }[]).map((row) => row.word_id);

  let wordRows: { last_rating: string | null }[] = [];
  if (wordIds.length > 0) {
    const { data, error: wordsError } = await supabase
      .from('words')
      .select('last_rating')
      .in('id', wordIds);

    assertNoError(wordsError, 'Failed to load words for section');
    wordRows = (data ?? []) as { last_rating: string | null }[];
  }

  // I1: a `locked` section hasn't been reached by the learner yet (it isn't
  // even practiceable), so it must never jump straight to `ready_to_read`
  // just because the rated word's recognition rate happens to already be
  // >=80% globally (e.g. the same word is already mastered in another book).
  // Only a section the learner is actively practicing (`ready_to_practice`)
  // is eligible to advance.
  if (status === 'locked') {
    return;
  }

  const rate = computeRecognitionRate(wordRows.map((row) => ({ lastRating: row.last_rating })));

  if (rate < UNLOCK_THRESHOLD) {
    return;
  }

  if (!PAST_READY_TO_READ.has(status)) {
    const { error: updateSectionError } = await supabase
      .from('sections')
      .update({ status: 'ready_to_read' })
      .eq('id', currentSectionId);

    assertNoError(updateSectionError, 'Failed to unlock reading for section');
  }

  const { data: nextSection, error: nextSectionError } = await supabase
    .from('sections')
    .select('id, status')
    .eq('book_id', bookId)
    .eq('section_number', sectionNumber + 1)
    .maybeSingle();

  assertNoError(nextSectionError, 'Failed to load next section');

  if (nextSection && (nextSection as { id: string; status: string }).status === 'locked') {
    const { error: updateNextError } = await supabase
      .from('sections')
      .update({ status: 'ready_to_practice' })
      .eq('id', (nextSection as { id: string; status: string }).id);

    assertNoError(updateNextError, 'Failed to unlock practice for next section');
  }
}
