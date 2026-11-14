import { notFound, redirect } from 'next/navigation';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';
import { getAuthedUser } from '@/lib/firebase/server';
import PracticeSession from '@/components/PracticeSession';
import type { FlashcardWord } from '@/components/Flashcard';
import { maybeUnlockNextSection } from '@/lib/sections/sectionService';

type SectionData = {
  sectionNumber: number;
  status: string;
  wordIds?: string[];
};

export default async function PracticePage({
  params,
}: {
  params: Promise<{ id: string; sectionNumber: string }>;
}) {
  const { id, sectionNumber } = await params;

  const user = await getAuthedUser();

  if (!user) {
    redirect('/login');
  }

  const db = getFirestore(getAdminApp());
  const bookRef = db.collection('books').doc(id);
  const bookSnap = await bookRef.get();
  const bookData = bookSnap.data() as { userId: string } | undefined;

  if (!bookSnap.exists || !bookData || bookData.userId !== user.uid) {
    notFound();
  }

  const sectionsQuery = await bookRef
    .collection('sections')
    .where('sectionNumber', '==', Number(sectionNumber))
    .limit(1)
    .get();

  if (sectionsQuery.empty) {
    notFound();
  }

  const sectionDoc = sectionsQuery.docs[0];
  const sectionId = sectionDoc.id;
  let sectionData = sectionDoc.data() as SectionData;

  // A locked section hasn't been reached yet — only a direct URL visit could
  // land here. ready_to_practice/ready_to_read/completed are all still
  // practiceable, since re-practicing a section is fine.
  if (sectionData.status === 'locked') {
    redirect(`/book/${id}`);
  }

  const wordIds = sectionData.wordIds ?? [];

  // C1: a section with zero vocabulary words (e.g. a short all-common tail
  // like "The End.") has nothing to rate, so the rate route's unlock check
  // — the only other place maybeUnlockNextSection is called — never fires
  // for it, and the book gets stuck here forever. Run the check here
  // instead, then re-check this section's status: if it just unlocked,
  // there's nothing to practice, so send the learner back to the book page.
  if (wordIds.length === 0) {
    await maybeUnlockNextSection(id, sectionId);

    const refreshedSnap = await bookRef.collection('sections').doc(sectionId).get();
    const refreshedData = refreshedSnap.data() as SectionData | undefined;

    if (refreshedData && refreshedData.status !== sectionData.status) {
      redirect(`/book/${id}`);
    }
  }

  // This page's job is "practice this section until it unlocks," not
  // spaced-repetition scheduling — so it always shows every word in the
  // section regardless of nextReviewDate. Due-date filtering belongs on the
  // future global review page instead.
  let words: FlashcardWord[] = [];
  if (wordIds.length > 0) {
    const wordsCollection = db.collection('words');
    const wordSnapshots = await Promise.all(wordIds.map((wordId) => wordsCollection.doc(wordId).get()));
    words = wordSnapshots
      .filter((snap) => snap.exists)
      .map((snap) => {
        const data = snap.data() as { word: string; definition: string | null };
        return { id: snap.id, word: data.word, definition: data.definition ?? null };
      });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold">Practice: Section {sectionData.sectionNumber}</h1>
      <PracticeSession
        words={words}
        doneMessage="Done — check back on the book page."
        doneHref={`/book/${id}`}
        doneLinkLabel="Back to book"
      />
    </main>
  );
}
