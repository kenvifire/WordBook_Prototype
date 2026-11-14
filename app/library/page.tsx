import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';
import { getAuthedUser } from '@/lib/firebase/server';
import AddBookForm from '@/components/AddBookForm';

type Book = {
  id: string;
  title: string;
  author: string | null;
};

export default async function LibraryPage() {
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

  const books: Book[] = booksSnapshot.docs.map((doc) => {
    const data = doc.data() as { title: string; author?: string | null };
    return { id: doc.id, title: data.title, author: data.author ?? null };
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Your library</h1>

      <AddBookForm />

      {books.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {books.map((book) => (
            <li key={book.id}>
              <Link
                href={`/book/${book.id}`}
                className="block rounded border px-3 py-2 hover:bg-gray-50"
              >
                <span className="font-medium">{book.title}</span>
                {book.author && (
                  <span className="ml-2 text-sm text-gray-600">by {book.author}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-600">No books yet. Add one above to get started.</p>
      )}
    </main>
  );
}
