import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';
import { getAuthedUser } from '@/lib/firebase/server';
import { fetchDefinition } from '@/lib/dictionary/dictionaryApi';
import { normalizeWord } from '@/lib/text/normalizeWord';

// The gRPC status code for ALREADY_EXISTS (google-gax's `Status.ALREADY_EXISTS`,
// also `@google-cloud/firestore`'s internal `StatusCode.ALREADY_EXISTS`).
//
// Verified against the installed firebase-admin/@google-cloud/firestore
// packages (see lib/books/bookService.ts, which hit this same race first): a
// failed `DocumentReference.create()` rejects with a raw `GoogleError` whose
// `.code` is this *number*, not a string like 'already-exists'.
const FIRESTORE_ALREADY_EXISTS_CODE = 6;

function isAlreadyExistsError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === FIRESTORE_ALREADY_EXISTS_CODE
  );
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

type WordDoc = {
  userId: string;
  word: string;
  definition: string | null;
  sectionRefs: { bookId: string; sectionId: string }[];
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewDate: string;
  lastRating: string | null;
};

export async function POST(request: NextRequest) {
  const user = await getAuthedUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { word?: unknown; add?: unknown }
    | null;
  const rawWord = typeof body?.word === 'string' ? body.word : '';
  const word = normalizeWord(rawWord);
  // I4: tapping a word in the reader is a read-only "show me the
  // definition" action and must never insert into the SRS queue. Only the
  // explicit "Add to my vocabulary" button sends `add: true`, which is the
  // only thing that creates a new word doc.
  const add = body?.add === true;

  if (!word) {
    return NextResponse.json({ error: 'word is required' }, { status: 400 });
  }

  const db = getFirestore(getAdminApp());
  // Deterministic id, same scheme as bookService's extraction-time words —
  // lets this route and book ingestion land on the exact same doc for a
  // given user+word without needing a query.
  const wordId = `${user.uid}_${word}`;
  const wordRef = db.collection('words').doc(wordId);

  const existingSnap = await wordRef.get();

  if (existingSnap.exists) {
    const existing = existingSnap.data() as WordDoc;
    let definition = existing.definition;

    // I4: a stored null definition means a past lookup failed or was never
    // retried (e.g. rate-limited during book ingestion). The spec fetches a
    // definition "when not already stored" — a null isn't a real stored
    // definition, so retry it here. This update touches only the
    // `definition` field — never SM-2 state, never sectionRefs — and only
    // commits when the retry actually resolves to something.
    if (definition === null) {
      const retried = await fetchDefinition(word);
      if (retried !== null) {
        await wordRef.update({ definition: retried });
        definition = retried;
      }
    }

    return NextResponse.json({ word, definition });
  }

  // Genuinely new word for this user. A plain lookup only fetches the
  // definition to display it and must NOT create a doc — that's what
  // previously made every tap (including accidental ones) add the word to
  // the SRS queue. Only `add: true` persists it.
  const definition = await fetchDefinition(word);

  if (!add) {
    return NextResponse.json({ word, definition });
  }

  // A reader-added word has no originating book or section — unlike
  // bookService's extraction-time words, which always get a non-empty
  // sectionRefs at creation. This empty array is exactly the signal
  // /review's controller uses to treat this word as "reader-added, no
  // originating book" even before it's ever been rated.
  const newWordDoc: WordDoc = {
    userId: user.uid,
    word,
    definition,
    sectionRefs: [],
    repetitions: 0,
    easeFactor: 2.5,
    intervalDays: 1,
    nextReviewDate: todayDateString(),
    lastRating: null,
  };

  try {
    await wordRef.create(newWordDoc);
    return NextResponse.json({ word, definition });
  } catch (error) {
    if (!isAlreadyExistsError(error)) {
      return NextResponse.json({ error: 'Failed to add word' }, { status: 500 });
    }

    // Race: another concurrent add:true request for this same brand-new
    // word won the create() first. Rather than surfacing a 500 to the
    // loser (the Supabase build's M8 behavior), transparently re-fetch and
    // return the winner's data — strictly better, and still correct since
    // both requests were adding the exact same word for the exact same
    // user.
    const winnerSnap = await wordRef.get();
    const winnerData = winnerSnap.data() as WordDoc | undefined;
    return NextResponse.json({ word, definition: winnerData?.definition ?? null });
  }
}
