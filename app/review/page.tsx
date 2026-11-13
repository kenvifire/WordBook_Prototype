import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PracticeSession from '@/components/PracticeSession';
import type { FlashcardWord } from '@/components/Flashcard';

export default async function ReviewPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) {
    redirect('/login');
  }

  // Same "today" representation the rate route uses for next_review_date
  // (new Date().toISOString().slice(0, 10)), so the due-date comparison here
  // lines up with what gets written back after a rating.
  const today = new Date().toISOString().slice(0, 10);

  // I9: without this, every word gets `next_review_date = current_date`
  // when first created (including every extraction-time word in a
  // just-added book, most of which are still in locked sections), so they'd
  // all show up here as "due" despite never having been practiced once.
  // Excluding never-rated words keeps this page to words the learner has
  // actually seen before.
  const { data: wordRows } = await supabase
    .from('words')
    .select('id, word, definition')
    .eq('user_id', user.id)
    .lte('next_review_date', today)
    .not('last_rating', 'is', null)
    .order('next_review_date', { ascending: true });

  const words = (wordRows ?? []) as FlashcardWord[];

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-8">
      <h1 className="text-xl font-semibold">Review</h1>
      <PracticeSession
        words={words}
        doneMessage="No more words due for review right now."
        doneHref="/library"
        doneLinkLabel="Back to library"
      />
    </main>
  );
}
