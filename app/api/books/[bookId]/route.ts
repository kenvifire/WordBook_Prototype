import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';
import { getAuthedUser } from '@/lib/firebase/server';
import { deleteBook } from '@/lib/books/bookService';

/**
 * DELETE /api/books/:bookId
 *
 * Removes a book and its sections subcollection. Ownership check mirrors
 * this app's existing style (app/api/books/[bookId]/sectioning/route.ts):
 * a missing or non-owned book returns 404, not 403/401, so as not to
 * reveal whether a given bookId exists for another user.
 */
export async function DELETE(
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

  await deleteBook({ bookId, userId: user.uid });

  return NextResponse.json({ ok: true });
}
