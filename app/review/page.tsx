import { redirect } from 'next/navigation';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';
import { getAuthedUser } from '@/lib/firebase/server';
import PracticeSession from '@/components/PracticeSession';
import type { FlashcardWord } from '@/components/Flashcard';

type WordDoc = {
  word: string;
  definition: string | null;
  lastRating: string | null;
  sectionRefs?: { bookId: string; sectionId: string }[];
};

export default async function ReviewPage() {
  const user = await getAuthedUser();

  if (!user) {
    redirect('/login');
  }

  // Same "today" representation the rate route uses for nextReviewDate
  // (new Date().toISOString().slice(0, 10)), so the due-date comparison here
  // lines up with what gets written back after a rating.
  const today = new Date().toISOString().slice(0, 10);

  const db = getFirestore(getAdminApp());

  // I9: without this, every word gets nextReviewDate = today when first
  // created (including every extraction-time word in a just-added book,
  // most of which are still in locked sections), so they'd all show up here
  // as "due" despite never having been practiced once. Excluding
  // never-rated words keeps this page to words the learner has actually
  // seen before.
  //
  // Exception: a word added via the reader's "Add to my vocabulary" button
  // (app/api/words/lookup/route.ts) has no section link (sectionRefs is
  // empty), so the practice flow never surfaces it either. Without this
  // "sectionRefs.length === 0" carve-out, such a word would never appear
  // anywhere — tapped-and-added words must still show up here even before
  // their first rating.
  //
  // Firestore can't express "nextReviewDate <= today AND (lastRating IS NOT
  // NULL OR sectionRefs is empty)" as a single compound query (an OR across
  // two different fields), so the userId + nextReviewDate range query runs
  // alone and the lastRating/sectionRefs carve-out is applied in memory on
  // the result set below.
  const snapshot = await db
    .collection('words')
    .where('userId', '==', user.uid)
    .where('nextReviewDate', '<=', today)
    .orderBy('nextReviewDate', 'asc')
    .get();

  const words: FlashcardWord[] = snapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as WordDoc) }))
    .filter((word) => word.lastRating !== null || (word.sectionRefs ?? []).length === 0)
    .map((word) => ({ id: word.id, word: word.word, definition: word.definition }));

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold">Review</h1>
      <PracticeSession
        words={words}
        doneMessage="No more words due for review right now."
        doneHref="/library"
        doneLinkLabel="Back to library"
      />
    </main>
  );
}
