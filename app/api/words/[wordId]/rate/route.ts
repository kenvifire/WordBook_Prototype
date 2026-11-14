import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';
import { getAuthedUser } from '@/lib/firebase/server';
import { applyRating, type Rating } from '@/lib/srs/sm2';
import { maybeUnlockNextSection } from '@/lib/sections/sectionService';

const VALID_RATINGS: readonly Rating[] = ['again', 'hard', 'good', 'easy'];

type WordDoc = {
  userId: string;
  word: string;
  definition: string | null;
  sectionRefs?: { bookId: string; sectionId: string }[];
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewDate: string;
  lastRating: Rating | null;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ wordId: string }> }
) {
  const { wordId } = await params;
  const user = await getAuthedUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // A malformed body (e.g. no body, or non-JSON) would otherwise throw out
  // of request.json() and surface as an uncaught 500, instead of the 400 a
  // bad request should get — mirrors the guard in
  // app/api/auth/session/route.ts.
  const body = (await request.json().catch(() => null)) as { rating?: Rating } | null;
  const rating = body?.rating as Rating;

  if (!VALID_RATINGS.includes(rating)) {
    return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
  }

  const db = getFirestore(getAdminApp());
  const wordRef = db.collection('words').doc(wordId);
  const wordSnap = await wordRef.get();

  if (!wordSnap.exists) {
    return NextResponse.json({ error: 'Word not found' }, { status: 404 });
  }

  const existingWord = wordSnap.data() as WordDoc;

  if (existingWord.userId !== user.uid) {
    return NextResponse.json({ error: 'Word not found' }, { status: 404 });
  }

  const result = applyRating(
    {
      repetitions: existingWord.repetitions,
      easeFactor: existingWord.easeFactor,
      intervalDays: existingWord.intervalDays,
    },
    rating,
    new Date()
  );

  const updates = {
    repetitions: result.repetitions,
    easeFactor: result.easeFactor,
    intervalDays: result.intervalDays,
    nextReviewDate: result.nextReviewDate.toISOString().slice(0, 10),
    lastRating: result.lastRating,
  };

  await wordRef.update(updates);

  // A word can belong to more than one section's vocabulary, so every
  // section it's linked to gets its own unlock check. The word's rating has
  // already been persisted above, so a failure here must not fail the whole
  // request — doing so would make the client retry and re-apply the rating
  // to an already-updated word (double-applying the SM-2 transition).
  try {
    const sectionRefs = existingWord.sectionRefs ?? [];
    for (const { bookId, sectionId } of sectionRefs) {
      await maybeUnlockNextSection(bookId, sectionId);
    }
  } catch (error) {
    console.error('Unlock check failed after rating word', wordId, error);
  }

  return NextResponse.json({ id: wordId, ...existingWord, ...updates });
}
