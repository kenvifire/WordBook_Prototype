import { getStorage } from 'firebase-admin/storage';
import { getAdminApp } from '@/lib/firebase/admin';

/**
 * Thin wrapper over Firebase Storage for a book's raw text while it's
 * awaiting user-driven sectioning (page-count vs. chapter-based — see the
 * v3 design doc). Firestore never stores the whole book in one place (the
 * 1 MiB per-document limit), so the raw text lands here first and is
 * deleted once `finalizeSectioning` has sliced it into section documents.
 *
 * Path convention: `pending-books/{userId}/{bookId}.txt`.
 */
function pendingBookTextPath(userId: string, bookId: string): string {
  return `pending-books/${userId}/${bookId}.txt`;
}

function pendingBookTextFile(userId: string, bookId: string) {
  return getStorage(getAdminApp())
    .bucket()
    .file(pendingBookTextPath(userId, bookId));
}

export async function savePendingBookText(
  userId: string,
  bookId: string,
  text: string
): Promise<void> {
  await pendingBookTextFile(userId, bookId).save(Buffer.from(text, 'utf-8'));
}

export async function readPendingBookText(userId: string, bookId: string): Promise<string> {
  const [buffer] = await pendingBookTextFile(userId, bookId).download();
  return buffer.toString('utf-8');
}

export async function deletePendingBookText(userId: string, bookId: string): Promise<void> {
  // ignoreNotFound: a second, accidental call to finalize the same book
  // must not throw when the blob is already gone.
  await pendingBookTextFile(userId, bookId).delete({ ignoreNotFound: true });
}
