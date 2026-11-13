import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRating, type Rating } from '@/lib/srs/sm2';
import { maybeUnlockNextSection } from '@/lib/sections/sectionService';

const VALID_RATINGS: readonly Rating[] = ['again', 'hard', 'good', 'easy'];

type WordRow = {
  id: string;
  user_id: string;
  word: string;
  definition: string | null;
  book_id: string | null;
  repetitions: number;
  ease_factor: number;
  interval_days: number;
  next_review_date: string;
  last_rating: string | null;
  created_at: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ wordId: string }> }
) {
  const { wordId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // M5: a malformed body (e.g. no body, or non-JSON) previously threw out of
  // request.json() and surfaced as an uncaught 500, instead of the 400 a bad
  // request should get — mirrors the guard the lookup route already has.
  const body = (await request.json().catch(() => null)) as { rating?: Rating } | null;
  const rating = body?.rating as Rating;

  if (!VALID_RATINGS.includes(rating)) {
    return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
  }

  // Filter by user_id for a clean 404 rather than relying on RLS alone to
  // silently return zero rows (same pattern as the book-ownership guard).
  const { data: wordRow, error: wordError } = await supabase
    .from('words')
    .select('*')
    .eq('id', wordId)
    .eq('user_id', user.id)
    .single();

  if (wordError || !wordRow) {
    return NextResponse.json({ error: 'Word not found' }, { status: 404 });
  }

  const existingWord = wordRow as WordRow;

  const result = applyRating(
    {
      repetitions: existingWord.repetitions,
      easeFactor: existingWord.ease_factor,
      intervalDays: existingWord.interval_days,
    },
    rating,
    new Date()
  );

  const updates = {
    repetitions: result.repetitions,
    ease_factor: result.easeFactor,
    interval_days: result.intervalDays,
    next_review_date: result.nextReviewDate.toISOString().slice(0, 10),
    last_rating: result.lastRating,
  };

  const { error: updateError } = await supabase
    .from('words')
    .update(updates)
    .eq('id', wordId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // A word can belong to more than one section's vocabulary, so every
  // section it's linked to gets its own unlock check. The word's rating has
  // already been persisted above, so a failure here must not fail the whole
  // request — doing so would make the client retry and re-apply the rating
  // to an already-updated word (double-applying the SM-2 transition).
  try {
    const { data: sectionWordRows } = await supabase
      .from('section_words')
      .select('section_id')
      .eq('word_id', wordId);

    for (const row of (sectionWordRows ?? []) as { section_id: string }[]) {
      await maybeUnlockNextSection(supabase, row.section_id);
    }
  } catch (error) {
    console.error('Unlock check failed after rating word', wordId, error);
  }

  return NextResponse.json({ ...existingWord, ...updates });
}
