import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';
import { isAlreadyExistsError } from '@/lib/firebase/errors';
import { invalidate } from '@/lib/cache/serverCache';
import { Section, splitByChapters, splitByPageCount } from '@/lib/text/sectionize';
import { extractVocabulary } from '@/lib/text/extractVocabulary';
import { translateWord } from '@/lib/translate/translateApi';
import { getUserProfile } from '@/lib/users/userProfile';
import { buildWordId } from '@/lib/firebase/wordId';
import { detectLanguage } from '@/lib/text/detectLanguage';
import {
  detectChapterBreaksByHeading,
  detectChapterBreaksFromTitles,
} from '@/lib/text/detectChapters';
import {
  deletePendingBookText,
  readPendingBookText,
  savePendingBookText,
} from '@/lib/storage/pendingBookText';

export type AddBookInput = {
  title: string;
  author?: string;
  format: 'text' | 'epub' | 'pdf';
  rawText: string;
  userId: string;
  // From the epub/pdf parser's outline, when available — used to prefer
  // detectChapterBreaksFromTitles over the plain heading scan below.
  chapterTitles?: string[];
};

export type AddBookResult = {
  bookId: string;
};

// I6: a section's new words were previously all looked up via one unbounded
// Promise.all, so a long section could fire thousands of simultaneous
// translation requests. This runs at most `limit` translateWord calls
// concurrently via a small worker-pool loop, preserving each word's result
// at its original index.
const TRANSLATION_CONCURRENCY = 5;

async function fetchDefinitionsWithLimit(
  words: string[],
  sourceLanguage: string,
  targetLanguage: string | null,
  limit: number = TRANSLATION_CONCURRENCY
): Promise<(string | null)[]> {
  const results: (string | null)[] = new Array(words.length).fill(null);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= words.length) return;
      // translateWord never rejects, but each call is still wrapped
      // defensively so one word's translation failure can never abort the
      // rest of the batch.
      results[index] = await translateWord(words[index], sourceLanguage, targetLanguage).catch(
        () => null
      );
    }
  }

  const workerCount = Math.min(limit, words.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

// SM-2 defaults for a brand-new word doc, matching lib/srs/sm2.ts's state
// shape and the word-lookup route's insert defaults.
function newWordDoc(params: {
  userId: string;
  word: string;
  language: string;
  definition: string | null;
  bookId: string;
  sectionId: string;
}): Record<string, unknown> {
  return {
    userId: params.userId,
    word: params.word,
    language: params.language,
    definition: params.definition,
    // Linked to the section it's being extracted from right here at create
    // time — not left as [] and filled in by the later batch — so a word
    // document is never observably "reader-added" (sectionRefs: []) during
    // the window between this create() and the batch commit below, nor
    // permanently so if the batch never runs (e.g. a crash, or this word
    // being deleted before the batch's update() can run). The batch's
    // arrayUnion for this same {bookId, sectionId} entry is then an
    // idempotent no-op for whichever caller's create() actually wins a
    // race; it's still load-bearing for the LOSER of that race, which falls
    // through to the catch below and still needs its own section linked.
    sectionRefs: [{ bookId: params.bookId, sectionId: params.sectionId }] as {
      bookId: string;
      sectionId: string;
    }[],
    repetitions: 0,
    easeFactor: 2.5,
    intervalDays: 1,
    nextReviewDate: todayDateString(),
    lastRating: null,
    // Immutable origin flag, set once at creation and never written again
    // (including by the existing-word branch below, which only ever
    // appends to sectionRefs). /review relies on this — not sectionRefs,
    // which grows over an extraction-time word's whole life — to tell an
    // extraction-time word apart from a reader-added one.
    addedFromReader: false,
  };
}

// Refactored out of addBook's body (see AGENTS.md's TDD/no-new-abstractions
// note — this stays a plain private helper, not a new service layer) so
// `finalizeSectioning` below, and Plan 4's `generateBook`, can both run the
// exact same candidate-words -> select-first -> definitions -> create() ->
// batch-link loop without duplicating it. Behavior is unchanged from
// today's addBook loop.
async function extractAndLinkWords(params: {
  sections: Section[];
  bookId: string;
  userId: string;
  language: string;
  sectionDocRefs: FirebaseFirestore.DocumentReference[];
}): Promise<void> {
  const { sections, bookId, userId, language, sectionDocRefs } = params;
  const db = getFirestore(getAdminApp());
  const wordsCollection = db.collection('words');

  // Fetched once per call (not threaded through as a new parameter — see
  // Plan 4 Task 2's ruling) since this function already receives `userId`.
  // `nativeLanguage` is the translation target for every new word extracted
  // below, for every book language, not just English.
  const { nativeLanguage } = await getUserProfile(userId);

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const sectionRef = sectionDocRefs[i];
    const sectionId = sectionRef.id;

    const candidateWords = extractVocabulary(section.text);
    if (candidateWords.length === 0) continue;

    const wordIds = candidateWords.map((word) => buildWordId(userId, language, word));

    // Select-first: a cheap get() per candidate (no write) tells us which
    // words are genuinely new for this user. Only those get a
    // translateWord call and a .create() attempt — an already-existing
    // word's definition/SM-2 state is never touched here; we select first
    // and never upsert.
    const existenceSnapshots = await Promise.all(
      wordIds.map((wordId) => wordsCollection.doc(wordId).get())
    );

    const newWordPositions: number[] = [];
    for (let j = 0; j < existenceSnapshots.length; j++) {
      if (!existenceSnapshots[j].exists) {
        newWordPositions.push(j);
      }
    }

    // Translation-based definitions, for every book language (not just
    // English, unlike the old dictionaryapi.dev-backed lookup this
    // replaced). translateWord itself already resolves to null — without
    // ever making a network call — for a null nativeLanguage, a
    // source/target pair it has no language code for, or a same-language
    // pair (see lib/translate/translateApi.ts), so no extra gating is
    // needed here.
    const definitions = await fetchDefinitionsWithLimit(
      newWordPositions.map((j) => candidateWords[j]),
      language,
      nativeLanguage
    );

    await Promise.all(
      newWordPositions.map(async (j, k) => {
        const wordId = wordIds[j];
        const word = candidateWords[j];
        const definition = definitions[k];
        try {
          await wordsCollection
            .doc(wordId)
            .create(newWordDoc({ userId, word, language, definition, bookId, sectionId }));
        } catch (error) {
          if (!isAlreadyExistsError(error)) {
            throw error;
          }
          // Genuine race: another concurrent addBook call (this user
          // re-extracting the same brand-new word from a different book,
          // or a second request for this same book) won the create() for
          // this deterministic id first. Nothing to do here — wordIds[j]
          // is still the correct, usable id for the section/word linking
          // below regardless of which caller's create() won.
        }
      })
    );

    // Batch-update: every candidate word (new or pre-existing) gets this
    // section appended to its sectionRefs, and the section gets every
    // candidate word id appended to its wordIds — written together so a
    // crash between them can never leave one side of a word/section pair
    // updated without the other.
    const batch = db.batch();
    batch.update(sectionRef, {
      wordIds: FieldValue.arrayUnion(...wordIds),
    });
    for (const wordId of wordIds) {
      batch.update(wordsCollection.doc(wordId), {
        sectionRefs: FieldValue.arrayUnion({ bookId, sectionId }),
      });
    }
    await batch.commit();
  }
}

export async function addBook(input: AddBookInput): Promise<AddBookResult> {
  const { title, author, format, rawText, userId, chapterTitles } = input;
  const db = getFirestore(getAdminApp());

  const language = detectLanguage(rawText);
  const detectedChapterBreaks = chapterTitles
    ? detectChapterBreaksFromTitles(rawText, chapterTitles)
    : detectChapterBreaksByHeading(rawText);

  // The whole book's flattened text is intentionally NOT stored on the book
  // doc. Firestore caps a single document at 1 MiB, and a long novel's text
  // (roughly 180k+ words) can exceed that on its own, which would make this
  // very `.add()` call reject with an opaque error. Sectioning (and the
  // per-section `text` slice each section doc carries) now happens later,
  // on demand, via `finalizeSectioning` — the raw text is stashed in
  // Storage via `savePendingBookText` below until then.
  const bookRef = await db.collection('books').add({
    userId,
    title,
    author: author ?? null,
    format,
    language,
    source: 'uploaded',
    sectioningMethod: null,
    pagesPerSection: null,
    detectedChapterBreaks,
    createdAt: FieldValue.serverTimestamp(),
  });
  const bookId = bookRef.id;

  // The book already needs to appear on the Bookshelf before sectioning is
  // chosen (it shows as `needsSetup` until finalizeSectioning runs), so this
  // invalidates listBooks' cache right after the book doc write, regardless
  // of/before the deferred-sectioning step below.
  invalidate(`books:${userId}`);

  await savePendingBookText(userId, bookId, rawText);

  return { bookId };
}

// Words are never touched here, on purpose: a word is global, per-user
// vocabulary independent of any one book's fate (same reasoning as
// generateBook.ts's failure-cleanup path, which also never deletes words).
// A word whose sectionRefs still point at this book's now-deleted sections
// is left with a stale reference — already a tolerated shape, since
// sectionRefs is an array a word can accumulate entries into from several
// books over its life.
export async function deleteBook(params: { bookId: string; userId: string }): Promise<void> {
  const { bookId, userId } = params;
  const db = getFirestore(getAdminApp());
  const bookRef = db.collection('books').doc(bookId);

  const sectionsSnap = await bookRef.collection('sections').get();

  const batch = db.batch();
  for (const sectionDoc of sectionsSnap.docs) {
    batch.delete(sectionDoc.ref);
  }
  batch.delete(bookRef);
  await batch.commit();

  invalidate(`books:${userId}`);
  invalidate(`sections:${bookId}`);
}

export async function finalizeSectioning(params: {
  bookId: string;
  userId: string;
  method: 'by_page' | 'by_chapter';
  pagesPerSection?: number;
}): Promise<void> {
  const { bookId, userId, method, pagesPerSection } = params;
  const db = getFirestore(getAdminApp());
  const bookRef = db.collection('books').doc(bookId);

  const bookSnap = await bookRef.get();
  if (!bookSnap.exists) {
    throw new Error('Failed to load book: no document found');
  }

  // BINDING RULING (plan preflight conflict scan, Review Focus #5): a
  // second, accidental call to finalizeSectioning on a book that has
  // already been finalized must be a safe no-op. Without this guard,
  // readPendingBookText below would throw (the blob is already deleted by
  // the first call) with an unhandled error visible to the user, and even
  // if it didn't, re-running extraction would double up sections/words.
  // sectioningMethod is set exactly once, at the end of a successful first
  // finalize, so its presence is the signal this already happened.
  //
  // Important #2: the plain get()-then-update() version of this guard only
  // protected a call made strictly AFTER a prior call had fully finished —
  // two near-simultaneous calls (a double-click, a retried request) could
  // both read sectioningMethod: null before either finished writing. The
  // check-and-claim now happens atomically inside one transaction, and the
  // claim (`tx.update` setting sectioningMethod) is written immediately —
  // before any slow work below (reading the pending blob, extracting
  // words) — so a second, truly concurrent call's transaction is guaranteed
  // to see it already set and return early via the same guard, race-safe.
  const claim = await db.runTransaction(async (tx) => {
    const freshSnap = await tx.get(bookRef);
    if (!freshSnap.exists) {
      throw new Error('Failed to load book: no document found');
    }
    const freshData = freshSnap.data() as {
      language: string;
      detectedChapterBreaks: number[] | null;
      sectioningMethod: string | null;
    };

    if (freshData.sectioningMethod != null) {
      return { alreadyDone: true as const };
    }

    tx.update(bookRef, {
      sectioningMethod: method,
      pagesPerSection: method === 'by_page' ? pagesPerSection ?? 1 : null,
    });

    return {
      alreadyDone: false as const,
      language: freshData.language,
      detectedChapterBreaks: freshData.detectedChapterBreaks,
    };
  });

  if (claim.alreadyDone) {
    return;
  }

  const { language, detectedChapterBreaks } = claim;

  const rawText = await readPendingBookText(userId, bookId);

  const sections =
    method === 'by_page'
      ? splitByPageCount(rawText, pagesPerSection ?? 1)
      : splitByChapters(rawText, detectedChapterBreaks ?? []);

  const sectionsCollection = bookRef.collection('sections');
  const sectionDocRefs = await Promise.all(
    sections.map((section) =>
      sectionsCollection.add({
        sectionNumber: section.sectionNumber,
        startWordIndex: section.startWordIndex,
        endWordIndex: section.endWordIndex,
        text: section.text,
        status: section.sectionNumber === 1 ? 'ready_to_practice' : 'locked',
        wordIds: [] as string[],
      })
    )
  );

  // listSections' cache for this book is pre-emptively empty at this point
  // (nothing could have populated it before sections existed), so this
  // invalidation is cheap, but harmless to call unconditionally here. The
  // books-list cache invalidation is load-bearing: the Bookshelf's
  // `needsSetup` flag (lib/books/listBooks.ts) is derived from
  // sectioningMethod, which this function just changed from null to a real
  // value — without this, the Bookshelf could show a stale "Not yet
  // started" banner for up to 15s after the user finishes this setup.
  invalidate(`sections:${bookId}`);
  invalidate(`books:${userId}`);

  await extractAndLinkWords({
    sections,
    bookId,
    userId,
    language,
    sectionDocRefs,
  });

  await deletePendingBookText(userId, bookId);
}
