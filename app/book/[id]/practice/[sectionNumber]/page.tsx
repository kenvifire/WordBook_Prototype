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
    .select('id, section_number, status')
    .eq('book_id', id)
    .eq('section_number', Number(sectionNumber))
    .single();

  if (!section) {
    notFound();
  }

  // A locked section hasn't been reached yet — only a direct URL visit could
  // land here. ready_to_practice/ready_to_read/completed are all still
  // practiceable, since re-practicing a section is fine.
  if (section.status === 'locked') {
    redirect(`/book/${id}`);
  }

  const { data: sectionWordRows } = await supabase
    .from('section_words')
    .select('word_id')
    .eq('section_id', section.id);

  const wordIds = ((sectionWordRows ?? []) as { word_id: string }[]).map((row) => row.word_id);

  // This page's job is "practice this section until it unlocks," not
  // spaced-repetition scheduling — so it always shows every word in the
  // section regardless of next_review_date. Due-date filtering belongs on
  // the future global review page instead.
  let words: FlashcardWord[] = [];
  if (wordIds.length > 0) {
    const { data: wordRows } = await supabase
      .from('words')
      .select('id, word, definition')
      .in('id', wordIds)
      .eq('user_id', user.id);

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
