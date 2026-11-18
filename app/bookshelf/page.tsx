import { redirect } from 'next/navigation';
import { getAuthedUser } from '@/lib/firebase/server';
import { listBooks } from '@/lib/books/listBooks';
import AddBookForm from '@/components/AddBookForm';
import GenerateBookForm from '@/components/GenerateBookForm';
import BookshelfList from '@/components/BookshelfList';
import BookshelfPendingPoller from '@/components/BookshelfPendingPoller';

export default async function BookshelfPage() {
  const user = await getAuthedUser();

  if (!user) {
    redirect('/login');
  }

  const books = await listBooks(user.uid);

  const hasPendingGeneration = books.some((book) => book.generationStatus === 'pending');

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col bg-paper px-4 py-8 font-ui">
      <h1 className="mb-6 text-2xl font-semibold text-ink">Bookshelf</h1>

      <BookshelfPendingPoller hasPending={hasPendingGeneration} />

      <AddBookForm />
      <GenerateBookForm />

      {books.length > 0 ? (
        <BookshelfList books={books} />
      ) : (
        <p className="text-sm text-ink-muted">No books yet. Add one above to get started.</p>
      )}
    </main>
  );
}
