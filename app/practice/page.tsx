import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';
import { getAuthedUser } from '@/lib/firebase/server';
import { getPracticeQueueForBook } from '@/lib/sections/practiceQueue';

type BookRow = {
  id: string;
  title: string;
  author: string | null;
  count: number;
};

export default async function PracticeTabPage() {
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

  // Simplest option the brief calls out: reuse getPracticeQueueForBook
  // directly per book and take its length, rather than re-running its two
  // queries here ourselves.
  const books: BookRow[] = await Promise.all(
    booksSnapshot.docs.map(async (doc) => {
      const data = doc.data() as { title: string; author?: string | null };
      const queue = await getPracticeQueueForBook(user.uid, doc.id);
      return {
        id: doc.id,
        title: data.title,
        author: data.author ?? null,
        count: queue.length,
      };
    })
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Practice</h1>

      {books.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {books.map((book) => (
            <li key={book.id} className="flex items-center justify-between gap-4 rounded border px-3 py-2">
              <div>
                <p className="font-medium">{book.title}</p>
                {book.author && <p className="text-sm text-gray-600">by {book.author}</p>}
                <p className="text-sm text-gray-600">
                  {book.count} word{book.count === 1 ? '' : 's'} to practice
                </p>
              </div>

              {book.count > 0 ? (
                <Link
                  href={`/practice/${book.id}`}
                  className="shrink-0 rounded bg-black px-3 py-1 text-sm font-medium text-white"
                >
                  Practice
                </Link>
              ) : (
                <Link
                  href={`/book/${book.id}`}
                  className="shrink-0 rounded border px-3 py-1 text-sm font-medium text-gray-500"
                >
                  Read instead
                </Link>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-600">No books yet.</p>
      )}
    </main>
  );
}
