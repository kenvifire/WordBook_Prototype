import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AddBookForm from '@/components/AddBookForm';

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    redirect('/login');
  }

  const { data: books } = await supabase
    .from('books')
    .select('id, title, author, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Your library</h1>

      <AddBookForm />

      {books && books.length > 0 ? (
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
