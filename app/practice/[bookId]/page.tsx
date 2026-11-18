import { notFound, redirect } from 'next/navigation';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';
import { getAuthedUser } from '@/lib/firebase/server';
import { getPracticeQueueForBook } from '@/lib/sections/practiceQueue';
import { maybeUnlockNextSection } from '@/lib/sections/sectionService';
import PracticeSession from '@/components/PracticeSession';

type SectionData = {
  sectionNumber: number;
  status: string;
  wordIds?: string[];
};

export default async function BookPracticePage({
  params,
}: {
  params: Promise<{ bookId: string }>;
}) {
  const { bookId } = await params;

  const user = await getAuthedUser();

  if (!user) {
    redirect('/login');
  }

  const db = getFirestore(getAdminApp());
  const bookRef = db.collection('books').doc(bookId);
  const bookSnap = await bookRef.get();
  const bookData = bookSnap.data() as { userId: string } | undefined;

  // getPracticeQueueForBook does not itself verify that bookId belongs to
  // this user — it trusts its caller — so this ownership check must happen
  // here, before calling it, exactly like
  // app/book/[id]/practice/[sectionNumber]/page.tsx already does for its
  // own Firestore reads.
  if (!bookSnap.exists || !bookData || bookData.userId !== user.uid) {
    notFound();
  }

  const queue = await getPracticeQueueForBook(user.uid, bookId);

  // C1 (mirrors app/book/[id]/practice/[sectionNumber]/page.tsx): an empty
  // queue can mean there's a zero-word section sitting at
  // ready_to_practice with nothing to rate, so the rate route's unlock
  // check — the only other place maybeUnlockNextSection is called — never
  // fires for it and the book would be stuck. Detect that specific case and
  // run the unlock check directly, then send the learner back to the
  // Practice tab list since there's nothing here to render either way.
  if (queue.length === 0) {
    const sectionsQuery = await bookRef
      .collection('sections')
      .where('status', '==', 'ready_to_practice')
      .orderBy('sectionNumber', 'asc')
      .limit(1)
      .get();

    if (!sectionsQuery.empty) {
      const sectionDoc = sectionsQuery.docs[0];
      const sectionData = sectionDoc.data() as SectionData;
      const wordIds = sectionData.wordIds ?? [];

      if (wordIds.length === 0) {
        await maybeUnlockNextSection(bookId, sectionDoc.id);
        redirect('/practice');
      }
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 bg-paper px-4 py-8 font-ui">
      <h1 className="text-xl font-semibold text-ink">Practice</h1>
      <PracticeSession
        words={queue}
        doneMessage="Done — check back on the Practice tab."
        doneHref="/practice"
        doneLinkLabel="Back to Practice"
      />
    </main>
  );
}
