import { notFound, redirect } from 'next/navigation';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';
import { getAuthedUser } from '@/lib/firebase/server';
import WordPopup from '@/components/WordPopup';

type BookData = {
  userId: string;
  title: string;
  language?: string;
};

type SectionData = {
  sectionNumber: number;
  text: string;
};

export default async function FreeReadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  // Free reading is read-only by construction: this page issues `.get()`
  // calls only — it never calls `.update()`/`.set()` on a section (or
  // anything else) anywhere in this file. That's what makes the Global
  // Constraints anti-goal ("Free reading and Section reading must never
  // affect each other's state") true structurally rather than by a runtime
  // check. Unlike the practice/read flow, every section's own `text` slice
  // renders here regardless of its `status` — locked, ready_to_practice,
  // ready_to_read, and completed sections all render identically.
  const sectionsSnapshot = await bookRef.collection('sections').orderBy('sectionNumber', 'asc').get();
  const sections = sectionsSnapshot.docs.map((doc) => {
    const data = doc.data() as SectionData;
    return { id: doc.id, sectionNumber: data.sectionNumber, text: data.text };
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold">{bookData.title} — Free reading</h1>

      {sections.map((section) => {
        const sectionWords = section.text
          .trim()
          .split(/\s+/)
          .filter((w) => w.length > 0);

        return (
          <p key={section.id} className="leading-loose">
            {sectionWords.map((word, index) => (
              <span key={index}>
                <WordPopup
                  word={word}
                  language={bookData.language ?? 'english'}
                  bookId={id}
                  sectionId={section.id}
                />{' '}
              </span>
            ))}
          </p>
        );
      })}
    </main>
  );
}
