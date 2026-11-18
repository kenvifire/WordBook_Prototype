import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';
import type { FlashcardWord } from '@/components/Flashcard';

type WordDoc = {
  word: string;
  definition: string | null;
  lastRating: string | null;
  sectionRefs?: { bookId: string; sectionId: string }[];
  addedFromReader?: boolean;
};

type SectionDoc = {
  sectionNumber: number;
  status: string;
  wordIds?: string[];
};

/**
 * The combined per-book practice queue: every word of the next section
 * that's actively being practiced (no due-date filter — sharp edge #1,
 * mirrors app/book/[id]/practice/[sectionNumber]/page.tsx), PLUS any word
 * already linked to this book that's due for spaced-repetition review today
 * (mirrors the removed /review page's query shape, scoped to one book).
 * The two lists are merged and de-duplicated by word id.
 */
export async function getPracticeQueueForBook(
  userId: string,
  bookId: string
): Promise<FlashcardWord[]> {
  const db = getFirestore(getAdminApp());
  const wordsCollection = db.collection('words');

  // Half 1: every word of the next ready_to_practice section, regardless of
  // due date. This is this page's "practice until it unlocks" job, not
  // spaced-repetition scheduling — a due-date filter here would make it
  // impossible to retry a failed word same-day (SM-2 pushes nextReviewDate
  // to tomorrow on every rating, including "again"). Due-date filtering
  // belongs only on the "due" half below.
  const sectionQuery = await db
    .collection('books')
    .doc(bookId)
    .collection('sections')
    .where('status', '==', 'ready_to_practice')
    .orderBy('sectionNumber', 'asc')
    .limit(1)
    .get();

  const unlockingWordIds: string[] = sectionQuery.empty
    ? []
    : ((sectionQuery.docs[0].data() as SectionDoc).wordIds ?? []);

  // Half 2: words already linked to this book that are due today. Firestore
  // can't filter the sectionRefs array-of-objects by bookId alone
  // server-side, so the userId + nextReviewDate range query runs alone and
  // the sectionRefs/lastRating carve-out is applied in memory below (same
  // approach the removed /review page used, scoped here to one book).
  const today = new Date().toISOString().slice(0, 10);
  const dueSnapshot = await wordsCollection
    .where('userId', '==', userId)
    .where('nextReviewDate', '<=', today)
    .get();

  const dueWordIds: string[] = dueSnapshot.docs
    .filter((doc) => {
      const data = doc.data() as WordDoc;
      const linkedToThisBook = (data.sectionRefs ?? []).some((ref) => ref.bookId === bookId);
      // I1: a reader-added word (`addedFromReader: true`) is created with
      // `lastRating: null` and would otherwise never satisfy
      // `lastRating !== null` below, making it permanently unreachable the
      // moment it's added — there's no global review view any more for it
      // to surface in instead. Keep it in this book's queue as long as it's
      // linked to this book, even though it's never been rated.
      const neverRatedReaderAdded = data.addedFromReader === true && data.lastRating === null;
      return linkedToThisBook && (data.lastRating !== null || neverRatedReaderAdded);
    })
    .map((doc) => doc.id);

  // Merge + de-duplicate, due words first (this plan's own ordering call,
  // not spec-mandated), then the unlocking section's not-yet-due words.
  const orderedIds = [...dueWordIds];
  for (const id of unlockingWordIds) {
    if (!orderedIds.includes(id)) {
      orderedIds.push(id);
    }
  }

  if (orderedIds.length === 0) {
    return [];
  }

  const wordSnapshots = await Promise.all(orderedIds.map((id) => wordsCollection.doc(id).get()));

  return wordSnapshots
    .filter((snap) => snap.exists)
    .map((snap) => {
      const data = snap.data() as WordDoc;
      return { id: snap.id, word: data.word, definition: data.definition ?? null };
    });
}
