import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';
import { getAuthedUser } from '@/lib/firebase/server';
import { finalizeSectioning } from '@/lib/books/bookService';

const VALID_METHODS = ['by_page', 'by_chapter'] as const;
type SectioningMethod = (typeof VALID_METHODS)[number];

function isValidMethod(value: unknown): value is SectioningMethod {
  return typeof value === 'string' && (VALID_METHODS as readonly string[]).includes(value);
}

/**
 * POST /api/books/:bookId/sectioning
 *
 * Deferred-sectioning setup: the user picks "by page count" or "by chapter"
 * (plus a page count, for the former) and this route slices the book's
 * pending raw text into section documents via finalizeSectioning. Ownership
 * check mirrors the existing style used across this app's routes
 * (app/api/words/[wordId]/rate/route.ts, and the page-level check in
 * app/book/[id]/practice/[sectionNumber]/page.tsx): a missing or
 * non-owned book returns 404, not 403/401, so as not to reveal whether a
 * given bookId exists for another user.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;
  const user = await getAuthedUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getFirestore(getAdminApp());
  const bookRef = db.collection('books').doc(bookId);
  const bookSnap = await bookRef.get();

  if (!bookSnap.exists) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 });
  }

  const bookData = bookSnap.data() as { userId: string };

  if (bookData.userId !== user.uid) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 });
  }

  // A malformed body (e.g. no body, or non-JSON) would otherwise throw out
  // of request.json() and surface as an uncaught 500, instead of the 400 a
  // bad request should get — mirrors the guard in
  // app/api/words/[wordId]/rate/route.ts.
  const body = (await request.json().catch(() => null)) as
    | { method?: unknown; pagesPerSection?: unknown }
    | null;

  if (!isValidMethod(body?.method)) {
    return NextResponse.json({ error: 'Invalid method' }, { status: 400 });
  }
  const method = body.method;

  let pagesPerSection: number | undefined;
  if (body.pagesPerSection !== undefined) {
    const value = body.pagesPerSection;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
      return NextResponse.json({ error: 'Invalid pagesPerSection' }, { status: 400 });
    }
    pagesPerSection = value;
  }

  await finalizeSectioning({
    bookId,
    userId: user.uid,
    method,
    pagesPerSection,
  });

  return NextResponse.json({ ok: true });
}
