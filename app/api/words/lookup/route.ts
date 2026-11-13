import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchDefinition } from '@/lib/dictionary/dictionaryApi';
import { normalizeWord } from '@/lib/text/normalizeWord';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { word?: unknown; add?: unknown }
    | null;
  const rawWord = typeof body?.word === 'string' ? body.word : '';
  const word = normalizeWord(rawWord);
  // I4: tapping a word in the reader is a read-only "show me the
  // definition" action and must never insert into the SRS queue. Only the
  // explicit "Add to my vocabulary" button sends `add: true`, which is the
  // only thing that creates a new words row.
  const add = body?.add === true;

  if (!word) {
    return NextResponse.json({ error: 'word is required' }, { status: 400 });
  }

  // Select-first: if this user already has a row for this word, reuse it as-is
  // — never overwrite an existing row's definition, book_id, or SM-2 state
  // (same rule as bookService's word-insert path; an upsert here would risk
  // wiping that out).
  const { data: existingWord, error: existingWordError } = await supabase
    .from('words')
    .select('id, definition')
    .eq('user_id', user.id)
    .eq('word', word)
    .maybeSingle();

  if (existingWordError) {
    return NextResponse.json({ error: existingWordError.message }, { status: 500 });
  }

  if (existingWord) {
    const existing = existingWord as { id: string; definition: string | null };
    let definition = existing.definition;

    // I4: a stored null definition means a past lookup failed or was never
    // retried (e.g. rate-limited during book ingestion). The spec fetches a
    // definition "when not already stored" — a null isn't a real stored
    // definition, so retry it here. The update is scoped to `definition is
    // null` so it can never clobber a definition that resolved in the
    // meantime, and it touches no other column (SRS state included).
    if (definition === null) {
      const retried = await fetchDefinition(word);
      if (retried !== null) {
        const { error: updateError } = await supabase
          .from('words')
          .update({ definition: retried })
          .eq('id', existing.id)
          .is('definition', null);

        if (!updateError) {
          definition = retried;
        }
      }
    }

    return NextResponse.json({ word, definition });
  }

  // Genuinely new word for this user. A plain lookup only fetches the
  // definition to display it and must NOT create a row — that's what
  // previously made every tap (including accidental ones) add the word to
  // the SRS queue. Only `add: true` persists it, with a plain insert (never
  // an upsert) of a brand-new row with SM-2 defaults.
  const definition = await fetchDefinition(word);

  if (!add) {
    return NextResponse.json({ word, definition });
  }

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
