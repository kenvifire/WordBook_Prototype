import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';
import { getAuthedUser } from '@/lib/firebase/server';
import WordPopup from '@/components/WordPopup';

type BookData = {
  userId: string;
  title: string;
  rawText: string;
};

type SectionData = {
  sectionNumber: number;
  status: string;
  startWordIndex: number;
  endWordIndex: number;
};

export default async function ReadPage({
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
  const bookData = bookSnap.data() as BookData | undefined;

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
  const sectionData = sectionDoc.data() as SectionData;

  // The reader is only reachable once reading has unlocked for this section
  // (the spec's "only reachable once unlocked" rule) — a direct URL visit to
  // a still-locked or practice-only section bounces back to the book page.
  if (sectionData.status !== 'ready_to_read' && sectionData.status !== 'completed') {
    redirect(`/book/${id}`);
  }

  // I3: simple prev/next navigation. Previous always exists once section 1
  // is passed (just link back one section number) — a section readable now
  // was necessarily practiced-and-unlocked in order, so the previous one
  // must already be at least readable too. Next only gets a link when the
  // next section has progressed at least to ready_to_practice — i.e. it's
  // reachable by some page — pointing at its practice page or its read page
  // depending on how far it's gotten.
  const previousSectionNumber = sectionData.sectionNumber > 1 ? sectionData.sectionNumber - 1 : null;

  const nextSectionQuery = await bookRef
    .collection('sections')
    .where('sectionNumber', '==', sectionData.sectionNumber + 1)
    .limit(1)
    .get();

  let nextSectionHref: string | null = null;
  if (!nextSectionQuery.empty) {
    const nextStatus = (nextSectionQuery.docs[0].data() as { status: string }).status;
    if (nextStatus === 'ready_to_practice') {
      nextSectionHref = `/book/${id}/practice/${sectionData.sectionNumber + 1}`;
    } else if (nextStatus === 'ready_to_read' || nextStatus === 'completed') {
      nextSectionHref = `/book/${id}/read/${sectionData.sectionNumber + 1}`;
    }
  }

  // Sections store word-index offsets into the book's flattened raw text
  // rather than their own copy of the text (same tokenization as
  // splitIntoSections), so the section's text is recomputed here the same
  // way it was at ingestion.
  const words = bookData.rawText
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const sectionWords = words.slice(sectionData.startWordIndex, sectionData.endWordIndex);

  async function markSectionComplete() {
    'use server';

    const actingUser = await getAuthedUser();

    if (!actingUser) {
      redirect('/login');
    }

    const actingDb = getFirestore(getAdminApp());
    await actingDb
      .collection('books')
      .doc(id)
      .collection('sections')
      .doc(sectionId)
      .update({ status: 'completed' });

    revalidatePath(`/book/${id}`);
    redirect(`/book/${id}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold">
        {bookData.title} — Section {sectionData.sectionNumber}
      </h1>

      <p className="leading-loose">
        {sectionWords.map((word, index) => (
          <span key={index}>
            <WordPopup word={word} />{' '}
          </span>
        ))}
      </p>

      <form action={markSectionComplete}>
        <button type="submit" className="rounded bg-black px-4 py-2 text-white">
          Mark section complete
        </button>
      </form>

      <nav className="flex items-center justify-between border-t pt-4 text-sm">
        {previousSectionNumber ? (
          <Link href={`/book/${id}/read/${previousSectionNumber}`} className="font-medium underline">
            ← Previous section
          </Link>
        ) : (
          <span />
        )}

        <Link href={`/book/${id}`} className="font-medium underline">
          Back to book
        </Link>

        {nextSectionHref ? (
          <Link href={nextSectionHref} className="font-medium underline">
            Next section →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
