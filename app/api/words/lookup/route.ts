import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';
import { getAuthedUser } from '@/lib/firebase/server';
import { isAlreadyExistsError } from '@/lib/firebase/errors';
import { fetchDefinition } from '@/lib/dictionary/dictionaryApi';
import { normalizeWord } from '@/lib/text/normalizeWord';
import { buildWordId } from '@/lib/firebase/wordId';

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

type WordDoc = {
  userId: string;
  word: string;
  language?: string;
  definition: string | null;
  sectionRefs: { bookId: string; sectionId: string }[];
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewDate: string;
  lastRating: string | null;
  addedFromReader?: boolean;
};

export async function POST(request: NextRequest) {
  const user = await getAuthedUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { word?: unknown; add?: unknown; language?: unknown; bookId?: unknown; sectionId?: unknown }
    | null;
  const rawWord = typeof body?.word === 'string' ? body.word : '';
  const word = normalizeWord(rawWord);
  // I4: tapping a word in the reader is a read-only "show me the
  // definition" action and must never insert into the SRS queue. Only the
  // explicit "Add to my vocabulary" button sends `add: true`, which is the
  // only thing that creates a new word doc.
  const add = body?.add === true;
  const language = typeof body?.language === 'string' ? body.language : null;
  // I1: optional — a plain tap-to-define request doesn't need these, only
  // the add:true new-word-creation path below does (to link the new word
  // back to the book/section it was added from, so it doesn't vanish from
  // every per-book practice queue forever). Absent/non-string values are
  // treated as "not provided" rather than 400ing the whole request.
  const bookId = typeof body?.bookId === 'string' ? body.bookId : null;
  const sectionId = typeof body?.sectionId === 'string' ? body.sectionId : null;

  if (!word) {
    return NextResponse.json({ error: 'word is required' }, { status: 400 });
  }

  // Lowercase ASCII letters only, matching how 'english'/'french' etc. are
  // written elsewhere in this plan. This also blocks a value containing '/'
  // (or any other character) from being interpolated unchecked into
  // buildWordId's Firestore document id, which would otherwise write to a
  // different path (e.g. a nested subcollection) and bypass the normal rules
  // path since this write goes through the server-side Admin SDK. It also
  // prevents case/format variants (e.g. 'English' vs 'english') from
  // silently forking a user's vocabulary into separate documents.
  if (!language || !/^[a-z]+$/.test(language)) {
    return NextResponse.json({ error: 'language is required' }, { status: 400 });
  }

  const db = getFirestore(getAdminApp());
  // Deterministic id, same scheme as bookService's extraction-time words —
  // lets this route and book ingestion land on the exact same doc for a
  // given user+word+language without needing a query.
  const wordId = buildWordId(user.uid, language, word);
  const wordRef = db.collection('words').doc(wordId);

  const existingSnap = await wordRef.get();

  // Defense in depth against word-ID squatting: the deterministic id scheme
  // (`${uid}_${language}_${word}`) means an attacker who knows this user's
  // uid could have created this exact doc id stamped with their own
  // `userId` before
  // this user ever looked the word up (the Firestore rules close this off
  // at the write path — this check guards the read path in case that
  // doc was ever written, e.g. before the rules fix deployed). Treat a
  // userId mismatch as if the doc didn't exist at all, rather than
  // returning or reusing attacker-controlled content.
  if (existingSnap.exists && (existingSnap.data() as WordDoc).userId !== user.uid) {
    return NextResponse.json({ error: 'Failed to look up word' }, { status: 500 });
  }

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
        try {
          await wordRef.update({ definition: retried });
        } catch {
          return NextResponse.json({ error: 'Failed to update word' }, { status: 500 });
        }
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

  // I1: a reader-added word is linked to the book/section it was added
  // from (when the caller provided one) so it stays reachable from that
  // book's practice queue instead of vanishing the moment it's added —
  // see getPracticeQueueForBook's addedFromReader carve-out. `sectionRefs`
  // is NOT a reliable long-term signal of "reader-added" though:
  // bookService.addBook grows an EXISTING word's sectionRefs on every
  // re-extraction, including a word that originated here. `addedFromReader`
  // is the immutable signal instead — set once, here, at creation, and
  // never written again by any later code path (including this route's
  // own existing-word branches above). getPracticeQueueForBook reads this
  // flag, not sectionRefs.length, to decide whether a never-rated word
  // should still show up in its book's practice queue.
  const newWordDoc: WordDoc = {
    userId: user.uid,
    word,
    language,
    definition,
    sectionRefs: bookId && sectionId ? [{ bookId, sectionId }] : [],
    repetitions: 0,
    easeFactor: 2.5,
    intervalDays: 1,
    nextReviewDate: todayDateString(),
    lastRating: null,
    addedFromReader: true,
  };

  try {
    await wordRef.create(newWordDoc);
    return NextResponse.json({ word, definition });
  } catch (error) {
    if (!isAlreadyExistsError(error)) {
      return NextResponse.json({ error: 'Failed to add word' }, { status: 500 });
    }

    // Race: another concurrent add:true request for this same brand-new
    // word won the create() first, so this one fails with already-exists.
    // Rather than surfacing a 500 to the loser, transparently re-fetch and
    // return the winner's data — strictly better, and still correct since
    // both requests were adding the exact same word for the exact same
    // user.
    const winnerSnap = await wordRef.get();
    const winnerData = winnerSnap.data() as WordDoc | undefined;
    return NextResponse.json({ word, definition: winnerData?.definition ?? null });
  }
}
