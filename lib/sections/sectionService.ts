import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';
import { getUserProfile } from '@/lib/users/userProfile';
import { invalidate } from '@/lib/cache/serverCache';

export type WordForRecognition = {
  lastRating: string | null;
};

export function computeRecognitionRate(words: WordForRecognition[]): number {
  // Review Focus #5: a section with zero vocabulary words (e.g. every word in
  // it was a common word, dropped during extraction) auto-passes rather than
  // dividing by zero.
  if (words.length === 0) {
    return 1;
  }
  const recognized = words.filter(
    (word) => word.lastRating === 'good' || word.lastRating === 'easy'
  ).length;
  return recognized / words.length;
}

export async function maybeUnlockNextSection(bookId: string, sectionId: string): Promise<void> {
  // listSections caches this book's section list — invalidate it
  // unconditionally whenever this function returns (via `finally`), even on
  // an early-return path that changed nothing. An unnecessary invalidation
  // is harmless; the alternative (invalidating only on the branches that
  // actually wrote something) risks missing one. See
  // lib/sections/listSections.ts.
  try {
    await maybeUnlockNextSectionInner(bookId, sectionId);
  } finally {
    invalidate(`sections:${bookId}`);
  }
}

async function maybeUnlockNextSectionInner(bookId: string, sectionId: string): Promise<void> {
  const db = getFirestore(getAdminApp());
  const sectionRef = db.collection('books').doc(bookId).collection('sections').doc(sectionId);

  const sectionSnap = await sectionRef.get();
  if (!sectionSnap.exists) {
    throw new Error('Failed to load section: no document found');
  }

  const sectionData = sectionSnap.data() as {
    sectionNumber: number;
    status: string;
    wordIds?: string[];
  };
  const { sectionNumber, status } = sectionData;
  const wordIds = sectionData.wordIds ?? [];

  // I1: only a section the learner is actively practicing
  // (`ready_to_practice`) is eligible to advance. A `locked` section hasn't
  // been reached by the learner yet, so it must never jump straight to
  // `ready_to_read` just because the rated word's recognition rate happens
  // to already be >=80% globally (e.g. the same word is already mastered in
  // another book). This same check also covers the idempotency case: a
  // section already past `ready_to_read`/`completed` must never be
  // relocked or re-unlocked by a later rating that crosses the threshold
  // again.
  if (status !== 'ready_to_practice') {
    return;
  }

  const bookSnap = await db.collection('books').doc(bookId).get();
  if (!bookSnap.exists) {
    throw new Error('Failed to load book: no document found');
  }
  const { userId } = bookSnap.data() as { userId: string };
  const { recognitionThreshold } = await getUserProfile(userId);

  let wordRows: { lastRating: string | null }[] = [];
  if (wordIds.length > 0) {
    const wordsCollection = db.collection('words');
    const wordSnapshots = await Promise.all(
      wordIds.map((wordId) => wordsCollection.doc(wordId).get())
    );
    wordRows = wordSnapshots.map((snap) => {
      const data = snap.data() as { lastRating?: string | null } | undefined;
      return { lastRating: data?.lastRating ?? null };
    });
  }

  const rate = computeRecognitionRate(wordRows);

  if (rate < recognitionThreshold) {
    return;
  }

  await sectionRef.update({ status: 'ready_to_read' });

  // The Bookshelf's cached book list (lib/books/listBooks.ts) includes each
  // book's "N of M sections unlocked" count, which this write just changed.
  invalidate(`books:${userId}`);

  const nextSectionQuery = await db
    .collection('books')
    .doc(bookId)
    .collection('sections')
    .where('sectionNumber', '==', sectionNumber + 1)
    .limit(1)
    .get();

  if (!nextSectionQuery.empty) {
    const nextSectionDoc = nextSectionQuery.docs[0];
    const nextStatus = (nextSectionDoc.data() as { status: string }).status;
    if (nextStatus === 'locked') {
      await nextSectionDoc.ref.update({ status: 'ready_to_practice' });
    }
  }
}
