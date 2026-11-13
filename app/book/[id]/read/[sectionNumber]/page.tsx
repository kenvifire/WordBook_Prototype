import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import WordPopup from '@/components/WordPopup';

type Book = {
  id: string;
  title: string;
  raw_text: string;
};

type SectionRow = {
  id: string;
  section_number: number;
  status: string;
  start_word_index: number;
  end_word_index: number;
};

export default async function ReadPage({
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
    .select('id, title, raw_text')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!book) {
    notFound();
  }

  const { data: section } = await supabase
    .from('sections')
    .select('id, section_number, status, start_word_index, end_word_index')
    .eq('book_id', id)
    .eq('section_number', Number(sectionNumber))
    .single();

  if (!section) {
    notFound();
  }

  const typedBook = book as Book;
  const typedSection = section as SectionRow;

  // The reader is only reachable once reading has unlocked for this section
  // (the spec's "only reachable once unlocked" rule) — a direct URL visit to
  // a still-locked or practice-only section bounces back to the book page.
  if (typedSection.status !== 'ready_to_read' && typedSection.status !== 'completed') {
    redirect(`/book/${id}`);
  }

  // Sections store word-index offsets into the book's raw text rather than
  // their own copy of the text (same tokenization as splitIntoSections), so
  // the section's text is recomputed here the same way it was at ingestion.
  const words = typedBook.raw_text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const sectionWords = words.slice(typedSection.start_word_index, typedSection.end_word_index);

  async function markSectionComplete() {
    'use server';

    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      redirect('/login');
    }

    await supabase
      .from('sections')
      .update({ status: 'completed' })
      .eq('id', typedSection.id);

    revalidatePath(`/book/${id}`);
    redirect(`/book/${id}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold">
        {typedBook.title} — Section {typedSection.section_number}
      </h1>

      <p className="leading-loose">
        {sectionWords.map((word, index) => (
          <span key={index}>
            <WordPopup word={word} />{' '}
          </span>
        ))}
      </p>

      <form action={markSectionComplete}>
        <button type="submit" className="rounded bg-black px-4 py-2 text-white">
          Mark section complete
        </button>
      </form>
    </main>
  );
}
