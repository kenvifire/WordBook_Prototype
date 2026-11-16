import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/firebase/server';
import { startGeneratingBook } from '@/lib/books/generateBook';

const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
type Difficulty = (typeof VALID_DIFFICULTIES)[number];

function isValidDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && (VALID_DIFFICULTIES as readonly string[]).includes(value);
}

const MIN_TARGET_WORD_COUNT = 5;
const MAX_TARGET_WORD_COUNT = 50;

type GenerateBody = {
  topic?: unknown;
  difficulty?: unknown;
  language?: unknown;
  targetWordCount?: unknown;
};

/**
 * POST /api/books/generate
 *
 * Kicks off AI story generation for a brand-new book. Validates the request
 * body, then hands off to startGeneratingBook (lib/books/generateBook.ts),
 * which creates the book doc with generationStatus: 'pending' and continues
 * the actual generation in the background — this route returns as soon as
 * that book doc exists, not once generation finishes.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthedUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // A malformed body (e.g. no body, or non-JSON) would otherwise throw out
  // of request.json() and surface as an uncaught 500, instead of the 400 a
  // bad request should get — mirrors the guard in
  // app/api/words/[wordId]/rate/route.ts.
  const body = (await request.json().catch(() => null)) as GenerateBody | null;

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (typeof body.topic !== 'string' || body.topic.trim().length === 0) {
    return NextResponse.json({ error: 'Invalid topic' }, { status: 400 });
  }

  if (!isValidDifficulty(body.difficulty)) {
    return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });
  }

  if (typeof body.language !== 'string' || body.language.trim().length === 0) {
    return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
  }

  const targetWordCount = body.targetWordCount;
  if (
    typeof targetWordCount !== 'number' ||
    !Number.isInteger(targetWordCount) ||
    targetWordCount < MIN_TARGET_WORD_COUNT ||
    targetWordCount > MAX_TARGET_WORD_COUNT
  ) {
    return NextResponse.json({ error: 'Invalid targetWordCount' }, { status: 400 });
  }

  const { bookId } = await startGeneratingBook({
    topic: body.topic,
    difficulty: body.difficulty,
    language: body.language,
    targetWordCount,
    userId: user.uid,
  });

  return NextResponse.json({ bookId }, { status: 201 });
}
