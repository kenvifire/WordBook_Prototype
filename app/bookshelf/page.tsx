import { redirect } from 'next/navigation';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';
import { getAuthedUser } from '@/lib/firebase/server';
import AddBookForm from '@/components/AddBookForm';
import GenerateBookForm from '@/components/GenerateBookForm';
import BookshelfList, { type BookshelfBook } from '@/components/BookshelfList';
import BookshelfPendingPoller from '@/components/BookshelfPendingPoller';

// Sections with these statuses have cleared the recognition-rate gate and
// are unlocked for reading (see AGENTS.md's unlock flow: locked ->
// ready_to_practice -> ready_to_read -> completed). `locked` and
// `ready_to_practice` are still gated, so they don't count.
const UNLOCKED_STATUSES = new Set(['ready_to_read', 'completed']);

// Fix 6: mirrors app/book/[id]/page.tsx's own stale-pending override — a
// generated book stuck in 'pending' (e.g. a server restart mid-generation)
// should eventually read as failed rather than pending forever. This is
// display-only: it changes only the value returned in this page's mapped
// BookshelfBook array, never written back to Firestore. It also naturally
// stops BookshelfPendingPoller from polling forever for a permanently-stuck
// book, since hasPendingGeneration is computed from this same mapped array.
const STALE_PENDING_MS = 5 * 60 * 1000;

function isPendingStale(createdAt: FirebaseFirestore.Timestamp | undefined): boolean {
  if (!createdAt) return false;
  return Date.now() - createdAt.toDate().getTime() > STALE_PENDING_MS;
}

export default async function BookshelfPage() {
  const user = await getAuthedUser();

  if (!user) {
    redirect('/login');
  }

  const db = getFirestore(getAdminApp());
  const booksSnapshot = await db
    .collection('books')
    .where('userId', '==', user.uid)
    .orderBy('createdAt', 'desc')
    .get();

  const books: BookshelfBook[] = await Promise.all(
    booksSnapshot.docs.map(async (doc) => {
      const data = doc.data() as {
        title: string;
        author?: string | null;
        language: string;
        source?: string;
        sectioningMethod?: string | null;
        generationStatus?: 'pending' | 'ready' | 'failed';
        createdAt?: FirebaseFirestore.Timestamp;
      };

      const sectionsSnapshot = await db.collection('books').doc(doc.id).collection('sections').get();
      const sectionsTotal = sectionsSnapshot.docs.length;
      const sectionsUnlocked = sectionsSnapshot.docs.filter((sectionDoc) => {
        const sectionData = sectionDoc.data() as { status: string };
        return UNLOCKED_STATUSES.has(sectionData.status);
      }).length;

      // Minor #5: an uploaded book has zero sections until its
      // deferred-sectioning setup is finalized (sectioningMethod set from
      // null to a real method) — show "Not yet started" for it instead of
      // the misleading "0 of 0 sections unlocked".
      const needsSetup = data.source === 'uploaded' && data.sectioningMethod == null;

      // Fix 6: display-only override — a 'pending' book whose createdAt is
      // more than 5 minutes old is shown as 'failed', without touching
      // Firestore.
      const generationStatus =
        data.generationStatus === 'pending' && isPendingStale(data.createdAt)
          ? 'failed'
          : data.generationStatus;

      return {
        id: doc.id,
        title: data.title,
        author: data.author ?? null,
        language: data.language,
        sectionsTotal,
        sectionsUnlocked,
        needsSetup,
        generationStatus,
      };
    })
  );

  const hasPendingGeneration = books.some((book) => book.generationStatus === 'pending');

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Bookshelf</h1>

      <BookshelfPendingPoller hasPending={hasPendingGeneration} />

      <AddBookForm />
      <GenerateBookForm />

      {books.length > 0 ? (
        <BookshelfList books={books} />
      ) : (
        <p className="text-sm text-gray-600">No books yet. Add one above to get started.</p>
      )}
    </main>
  );
}
