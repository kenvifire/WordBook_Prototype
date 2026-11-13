import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SectionStatusBadge from '@/components/SectionStatusBadge';

type Section = {
  id: string;
  section_number: number;
  status: string;
};

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    redirect('/login');
  }

  const { data: book } = await supabase
    .from('books')
    .select('id, title, author')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!book) {
    notFound();
  }

  const { data: sections } = await supabase
    .from('sections')
    .select('id, section_number, status')
    .eq('book_id', id)
    .order('section_number', { ascending: true });

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold">{book.title}</h1>
      {book.author && <p className="mb-6 text-sm text-gray-600">by {book.author}</p>}

      {sections && sections.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {(sections as Section[]).map((section) => {
            const label = `Section ${section.section_number}`;

            let href: string | null = null;
            if (section.status === 'ready_to_practice') {
              href = `/book/${id}/practice/${section.section_number}`;
            } else if (section.status === 'ready_to_read' || section.status === 'completed') {
              href = `/book/${id}/read/${section.section_number}`;
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
      )}
    </main>
  );
}
