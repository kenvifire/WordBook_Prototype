import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchDefinition } from '@/lib/dictionary/dictionaryApi';

// Matches the same tokenization rule as extractVocabulary (lib/text/extractVocabulary.ts)
// so a tap-to-define lookup on, say, "Hello," in the reader resolves to the same
// `word` row ("hello") that section ingestion may have already created/linked.
function normalizeWord(raw: string): string {
  const match = raw.match(/[a-zA-Z']+/);
  return match ? match[0].toLowerCase() : '';
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { word?: unknown } | null;
  const rawWord = typeof body?.word === 'string' ? body.word : '';
  const word = normalizeWord(rawWord);

  if (!word) {
    return NextResponse.json({ error: 'word is required' }, { status: 400 });
  }

  // Select-first: if this user already has a row for this word, reuse it as-is
  // and return its existing definition without touching the row at all — never
  // overwrite an existing row's definition, book_id, or SM-2 state (same rule as
  // bookService's word-insert path; an upsert here would risk wiping that out).
  const { data: existingWord, error: existingWordError } = await supabase
    .from('words')
    .select('definition')
    .eq('user_id', user.id)
    .eq('word', word)
    .maybeSingle();

  if (existingWordError) {
    return NextResponse.json({ error: existingWordError.message }, { status: 500 });
  }

  if (existingWord) {
    return NextResponse.json({
      word,
      definition: (existingWord as { definition: string | null }).definition,
    });
  }

  // Genuinely new word for this user: look up its definition and insert a
  // brand-new row with SM-2 defaults. This is a plain insert, not an upsert,
  // so there's no conflict to resolve and no risk of overwriting anything.
  const definition = await fetchDefinition(word);
  const today = new Date().toISOString().slice(0, 10);

  const { error: insertError } = await supabase.from('words').insert({
    user_id: user.id,
    word,
    definition,
    repetitions: 0,
    ease_factor: 2.5,
    interval_days: 1,
    next_review_date: today,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ word, definition });
}
