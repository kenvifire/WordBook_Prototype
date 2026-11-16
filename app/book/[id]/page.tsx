import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';
import { getAuthedUser } from '@/lib/firebase/server';
import SectionStatusBadge from '@/components/SectionStatusBadge';
import SectioningSetupForm from '@/components/SectioningSetupForm';
import ReadingModeToggle from '@/components/ReadingModeToggle';

type Section = {
  id: string;
  sectionNumber: number;
  status: string;
};

type BookData = {
  userId: string;
  title: string;
  author?: string | null;
  language?: string;
  source?: 'uploaded' | 'ai_generated';
  sectioningMethod?: 'by_page' | 'by_chapter' | 'fixed_word_count' | null;
  detectedChapterBreaks?: number[] | null;
};

export default async function BookDetailPage({
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

  // First-open sectioning setup: an uploaded book that hasn't had a
  // sectioning method chosen yet shows the setup screen instead of the
  // normal reading-mode view. This is derived purely from the book doc's
  // current `source`/`sectioningMethod` fields, not from any "have I been
  // here before" flag — so a user who abandons this screen without
  // confirming a method and revisits the book later lands back on this
  // same setup screen (Plan 3 Review Focus item 4), rather than on a
  // half-sectioned book or a crash reading `sections` that don't exist
  // yet. An AI-generated book (source: 'ai_generated') never takes this
  // branch, even before it's ever been visited, since its sections are
  // created up front rather than deferred.
  const showSetupScreen = bookData.source === 'uploaded' && bookData.sectioningMethod == null;

  if (showSetupScreen) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8">
        <h1 className="mb-1 text-2xl font-semibold">{bookData.title}</h1>
        {bookData.author && <p className="mb-6 text-sm text-gray-600">by {bookData.author}</p>}

        <SectioningSetupForm
          bookId={id}
          hasChapterBreaks={bookData.detectedChapterBreaks != null}
        />
      </main>
    );
  }

  const sectionsSnapshot = await bookRef.collection('sections').orderBy('sectionNumber', 'asc').get();
  const sections: Section[] = sectionsSnapshot.docs.map((doc) => {
    const data = doc.data() as { sectionNumber: number; status: string };
    return { id: doc.id, sectionNumber: data.sectionNumber, status: data.status };
  });

  const sectionList =
    sections.length > 0 ? (
      <ul className="flex flex-col gap-2">
        {sections.map((section) => {
          const label = `Section ${section.sectionNumber}`;

          let href: string | null = null;
          if (section.status === 'ready_to_practice') {
            href = `/book/${id}/practice/${section.sectionNumber}`;
          } else if (section.status === 'ready_to_read' || section.status === 'completed') {
            href = `/book/${id}/read/${section.sectionNumber}`;
          }

          return (
            <li
              key={section.id}
              className="flex items-center justify-between rounded border px-3 py-2"
            >
              {href ? (
                <Link href={href} className="font-medium hover:underline">
                  {label}
                </Link>
              ) : (
                <span className="font-medium text-gray-500">{label}</span>
              )}
              <SectionStatusBadge status={section.status} />
            </li>
          );
        })}
      </ul>
    ) : (
      <p className="text-sm text-gray-600">This book has no sections yet.</p>
    );

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold">{bookData.title}</h1>
      {bookData.author && <p className="mb-6 text-sm text-gray-600">by {bookData.author}</p>}

      <ReadingModeToggle bookId={id} language={bookData.language ?? ''} sectionList={sectionList} />
    </main>
  );
}
