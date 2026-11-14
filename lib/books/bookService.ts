import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';
import { isAlreadyExistsError } from '@/lib/firebase/errors';
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

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

// SM-2 defaults for a brand-new word doc, matching lib/srs/sm2.ts's state
// shape and the word-lookup route's insert defaults.
function newWordDoc(params: {
  userId: string;
  word: string;
  definition: string | null;
  bookId: string;
  sectionId: string;
}): Record<string, unknown> {
  return {
    userId: params.userId,
    word: params.word,
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
  };
}

export async function addBook(input: AddBookInput): Promise<AddBookResult> {
  const { title, author, format, rawText, userId } = input;
  const db = getFirestore(getAdminApp());

  const bookRef = await db.collection('books').add({
    userId,
    title,
    author: author ?? null,
    format,
    rawText,
  });
  const bookId = bookRef.id;

  const sections = splitIntoSections(rawText);
  if (sections.length === 0) {
    return { bookId };
  }

  const sectionsCollection = bookRef.collection('sections');
  const wordsCollection = db.collection('words');

  // Create every section doc up front (order doesn't matter between them —
  // each is addressed by its own auto-id afterward).
  const sectionDocRefs = await Promise.all(
    sections.map((section) =>
      sectionsCollection.add({
        sectionNumber: section.sectionNumber,
        startWordIndex: section.startWordIndex,
        endWordIndex: section.endWordIndex,
        status: section.sectionNumber === 1 ? 'ready_to_practice' : 'locked',
        wordIds: [] as string[],
      })
    )
  );

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const sectionRef = sectionDocRefs[i];
    const sectionId = sectionRef.id;

    const candidateWords = extractVocabulary(section.text);
    if (candidateWords.length === 0) continue;

    const wordIds = candidateWords.map((word) => `${userId}_${word}`);

    // Select-first: a cheap get() per candidate (no write) tells us which
    // words are genuinely new for this user. Only those get a
    // fetchDefinition call and a .create() attempt — an already-existing
    // word's definition/SM-2 state is never touched here, matching the
    // Supabase build's "select-first, never upsert" rule.
    const existenceSnapshots = await Promise.all(
      wordIds.map((wordId) => wordsCollection.doc(wordId).get())
    );

    const newWordPositions: number[] = [];
    for (let j = 0; j < existenceSnapshots.length; j++) {
      if (!existenceSnapshots[j].exists) {
        newWordPositions.push(j);
      }
    }

    const definitions = await fetchDefinitionsWithLimit(
      newWordPositions.map((j) => candidateWords[j])
    );

    await Promise.all(
      newWordPositions.map(async (j, k) => {
        const wordId = wordIds[j];
        const word = candidateWords[j];
        const definition = definitions[k];
        try {
          await wordsCollection
            .doc(wordId)
            .create(newWordDoc({ userId, word, definition, bookId, sectionId }));
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

  return { bookId };
}
