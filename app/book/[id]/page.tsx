import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';
import { getAuthedUser } from '@/lib/firebase/server';
import { listSections } from '@/lib/sections/listSections';
import SectionStatusBadge from '@/components/SectionStatusBadge';
import SectioningSetupForm from '@/components/SectioningSetupForm';
import ReadingModeToggle from '@/components/ReadingModeToggle';
import DeleteBookButton from '@/components/DeleteBookButton';

type BookData = {
  userId: string;
  title: string;
  author?: string | null;
  language?: string;
  source?: 'uploaded' | 'ai_generated';
  sectioningMethod?: 'by_page' | 'by_chapter' | 'fixed_word_count' | null;
  detectedChapterBreaks?: number[] | null;
  generationStatus?: 'pending' | 'ready' | 'failed';
  createdAt?: FirebaseFirestore.Timestamp;
};

// Fix 5: a stuck 'pending' generation (e.g. a server restart mid-generation)
// should eventually read as failed rather than pending forever, per this
// plan's Review Focus #1 — mirrors the same 5-minute threshold used by
// app/bookshelf/page.tsx's display-only staleness override.
const STALE_PENDING_MS = 5 * 60 * 1000;

function isPendingStale(createdAt: FirebaseFirestore.Timestamp | undefined): boolean {
  if (!createdAt) return false;
  return Date.now() - createdAt.toDate().getTime() > STALE_PENDING_MS;
}

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
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col bg-paper px-4 py-8 font-ui">
        <h1 className="mb-1 text-2xl font-semibold text-ink">{bookData.title}</h1>
        {bookData.author && <p className="mb-6 text-sm text-ink-muted">by {bookData.author}</p>}

        <SectioningSetupForm
          bookId={id}
          hasChapterBreaks={bookData.detectedChapterBreaks != null}
        />
      </main>
    );
  }

  // Fix 5: a pending or failed generated book has no sections to show and
  // must not fall through to the normal Free/Section toggle + section list
  // below, which would otherwise render "This book has no sections yet"
  // with no indication of WHY or whether it'll ever have any. A stale
  // 'pending' status (createdAt more than 5 minutes old) is treated as
  // failed for this check, same reasoning as the Bookshelf's own override.
  if (bookData.source === 'ai_generated' && bookData.generationStatus !== 'ready') {
    const stale = bookData.generationStatus === 'pending' && isPendingStale(bookData.createdAt);
    const isFailed = bookData.generationStatus === 'failed' || stale;
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col bg-paper px-4 py-8 font-ui">
        <h1 className="mb-1 text-2xl font-semibold text-ink">{bookData.title}</h1>
        <p className={`text-sm ${isFailed ? 'text-error' : 'text-ink-muted'}`}>
          {isFailed ? 'Generation failed.' : 'Generating…'}
        </p>
      </main>
    );
  }

  const sections = await listSections(id);

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
              className="flex items-center justify-between rounded border border-hairline bg-surface px-3 py-2"
            >
              {href ? (
                <Link href={href} className="font-medium text-ink hover:underline">
                  {label}
                </Link>
              ) : (
                <span className="font-medium text-ink-muted">{label}</span>
              )}
              <SectionStatusBadge status={section.status} />
            </li>
          );
        })}
      </ul>
    ) : (
      <p className="text-sm text-ink-muted">This book has no sections yet.</p>
    );

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col bg-paper px-4 py-8 font-ui">
      <h1 className="mb-1 text-2xl font-semibold text-ink">{bookData.title}</h1>
      {bookData.author && <p className="mb-6 text-sm text-ink-muted">by {bookData.author}</p>}

      <ReadingModeToggle bookId={id} language={bookData.language ?? ''} sectionList={sectionList} />

      <div className="mt-8 border-t border-hairline pt-4">
        <DeleteBookButton bookId={id} />
      </div>
    </main>
  );
}
