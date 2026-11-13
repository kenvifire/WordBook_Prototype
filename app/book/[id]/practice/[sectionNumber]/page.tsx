import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PracticeSession from '@/components/PracticeSession';
import type { FlashcardWord } from '@/components/Flashcard';

export default async function PracticePage({
  params,
}: {
  params: Promise<{ id: string; sectionNumber: string }>;
}) {
  const { id, sectionNumber } = await params;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    redirect('/login');
  }

  const { data: book } = await supabase
    .from('books')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!book) {
    notFound();
  }

  const { data: section } = await supabase
    .from('sections')
    .select('id, section_number')
    .eq('book_id', id)
    .eq('section_number', Number(sectionNumber))
    .single();

  if (!section) {
    notFound();
  }

  const { data: sectionWordRows } = await supabase
    .from('section_words')
    .select('word_id')
    .eq('section_id', section.id);

  const wordIds = ((sectionWordRows ?? []) as { word_id: string }[]).map((row) => row.word_id);

  const today = new Date().toISOString().slice(0, 10);

  let words: FlashcardWord[] = [];
  if (wordIds.length > 0) {
    const { data: wordRows } = await supabase
      .from('words')
      .select('id, word, definition')
      .in('id', wordIds)
      .eq('user_id', user.id)
      .lte('next_review_date', today);

    words = (wordRows ?? []) as FlashcardWord[];
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold">Practice: Section {section.section_number}</h1>
      <PracticeSession
        words={words}
        doneMessage="Done — check back on the book page."
        doneHref={`/book/${id}`}
        doneLinkLabel="Back to book"
      />
    </main>
  );
}
