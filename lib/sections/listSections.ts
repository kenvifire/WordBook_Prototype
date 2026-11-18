import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';
import { getOrSet } from '@/lib/cache/serverCache';

export type SectionSummary = {
  id: string;
  sectionNumber: number;
  status: string;
};

/**
 * Lists a book's sections ordered by sectionNumber — the exact query that
 * used to live inline in app/book/[id]/page.tsx. Cached per-bookId for 15s
 * via getOrSet (see lib/cache/serverCache.ts); maybeUnlockNextSection
 * (lib/sections/sectionService.ts) and the reader's markSectionComplete
 * server action (app/book/[id]/read/[sectionNumber]/page.tsx) both
 * invalidate this cache so a freshly unlocked or completed section's status
 * is visible on the very next call rather than waiting out the TTL.
 */
export async function listSections(bookId: string): Promise<SectionSummary[]> {
  return getOrSet(`sections:${bookId}`, 15_000, async () => {
    const db = getFirestore(getAdminApp());
    const sectionsSnapshot = await db
      .collection('books')
      .doc(bookId)
      .collection('sections')
      .orderBy('sectionNumber', 'asc')
      .get();

    return sectionsSnapshot.docs.map((doc) => {
      const data = doc.data() as { sectionNumber: number; status: string };
      return { id: doc.id, sectionNumber: data.sectionNumber, status: data.status };
    });
  });
}
