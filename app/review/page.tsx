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
  addedFromReader?: boolean;
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
  // (app/api/words/lookup/route.ts) has no section link, so the practice
  // flow never surfaces it either — it must still show up here even before
  // its first rating. This carve-out is keyed on the immutable
  // `addedFromReader` flag, NOT on `sectionRefs.length === 0`: sectionRefs
  // grows over a word's whole life (bookService.addBook appends to an
  // EXISTING word's sectionRefs on every re-extraction, including a word
  // that originated here), so it stops being empty the moment any later
  // book happens to contain the same word — which would otherwise make the
  // word silently drop off this page until its now-nonempty sectionRefs'
  // section gets practiced, possibly weeks away.
  //
  // Firestore can't express "nextReviewDate <= today AND (lastRating IS NOT
  // NULL OR addedFromReader IS true)" as a single compound query (an OR
  // across two different fields), so the userId + nextReviewDate range
  // query runs alone and the lastRating/addedFromReader carve-out is
  // applied in memory on the result set below.
  const snapshot = await db
    .collection('words')
    .where('userId', '==', user.uid)
    .where('nextReviewDate', '<=', today)
    .orderBy('nextReviewDate', 'asc')
    .get();

  const words: FlashcardWord[] = snapshot.docs
    .map((doc) => ({ id: doc.id, ...(doc.data() as WordDoc) }))
    .filter((word) => word.lastRating !== null || word.addedFromReader === true)
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
