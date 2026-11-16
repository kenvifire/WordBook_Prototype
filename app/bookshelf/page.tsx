import { redirect } from 'next/navigation';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';
import { getAuthedUser } from '@/lib/firebase/server';
import AddBookForm from '@/components/AddBookForm';
import BookshelfList, { type BookshelfBook } from '@/components/BookshelfList';

// Sections with these statuses have cleared the recognition-rate gate and
// are unlocked for reading (see AGENTS.md's unlock flow: locked ->
// ready_to_practice -> ready_to_read -> completed). `locked` and
// `ready_to_practice` are still gated, so they don't count.
const UNLOCKED_STATUSES = new Set(['ready_to_read', 'completed']);

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
      const data = doc.data() as { title: string; author?: string | null; language: string };

      const sectionsSnapshot = await db.collection('books').doc(doc.id).collection('sections').get();
      const sectionsTotal = sectionsSnapshot.docs.length;
      const sectionsUnlocked = sectionsSnapshot.docs.filter((sectionDoc) => {
        const sectionData = sectionDoc.data() as { status: string };
        return UNLOCKED_STATUSES.has(sectionData.status);
      }).length;

      return {
        id: doc.id,
        title: data.title,
        author: data.author ?? null,
        language: data.language,
        sectionsTotal,
        sectionsUnlocked,
      };
    })
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Bookshelf</h1>

      <AddBookForm />

      {books.length > 0 ? (
        <BookshelfList books={books} />
      ) : (
        <p className="text-sm text-gray-600">No books yet. Add one above to get started.</p>
      )}
    </main>
  );
}
