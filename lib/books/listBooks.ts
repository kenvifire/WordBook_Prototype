import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';
import { getOrSet } from '@/lib/cache/serverCache';

// Sections with these statuses have cleared the recognition-rate gate and
// are unlocked for reading (see AGENTS.md's unlock flow: locked ->
// ready_to_practice -> ready_to_read -> completed). `locked` and
// `ready_to_practice` are still gated, so they don't count.
const UNLOCKED_STATUSES = new Set(['ready_to_read', 'completed']);

// Fix 6: mirrors app/book/[id]/page.tsx's own stale-pending override — a
// generated book stuck in 'pending' (e.g. a server restart mid-generation)
// should eventually read as failed rather than pending forever. This is
// display-only: it changes only the value returned in the mapped
// BookSummary array, never written back to Firestore. It also naturally
// stops BookshelfPendingPoller from polling forever for a permanently-stuck
// book, since hasPendingGeneration is computed from this same mapped array.
const STALE_PENDING_MS = 5 * 60 * 1000;

function isPendingStale(createdAt: FirebaseFirestore.Timestamp | undefined): boolean {
  if (!createdAt) return false;
  return Date.now() - createdAt.toDate().getTime() > STALE_PENDING_MS;
}

export type BookSummary = {
  id: string;
  title: string;
  author: string | null;
  language: string;
  sectionsTotal: number;
  sectionsUnlocked: number;
  // Minor #5: true for an uploaded book that hasn't finished its
  // deferred-sectioning setup yet (source: 'uploaded' and
  // sectioningMethod still null) — such a book has zero sections, which
  // would otherwise render as the misleading "0 of 0 sections unlocked".
  needsSetup: boolean;
  // Only ever set on an ai_generated book: 'pending' while DeepSeek
  // generation + sectioning is still running in the background, 'failed'
  // if it errored out, 'ready' once its sections/words exist. An uploaded
  // book has no generationStatus field at all (undefined), and a ready
  // generated book renders identically to an uploaded one. needsSetup and
  // generationStatus are mutually exclusive by construction — needsSetup
  // only ever applies to source: 'uploaded', generationStatus only ever
  // applies to source: 'ai_generated'.
  generationStatus?: 'pending' | 'ready' | 'failed';
};

/**
 * Lists every book owned by `userId`, newest first, with each book's
 * section-unlock progress — the exact query + mapping that used to live
 * inline in `app/bookshelf/page.tsx`. Cached per-uid for 15s via
 * `getOrSet` (see `lib/cache/serverCache.ts`); `addBook` and
 * `startGeneratingBook` both invalidate this cache so a newly created book
 * appears on the very next call rather than waiting out the TTL.
 */
export async function listBooks(userId: string): Promise<BookSummary[]> {
  return getOrSet(`books:${userId}`, 15_000, async () => {
    const db = getFirestore(getAdminApp());
    const booksSnapshot = await db
      .collection('books')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    return Promise.all(
      booksSnapshot.docs.map(async (doc) => {
        const data = doc.data() as {
          title: string;
          author?: string | null;
          language: string;
          source?: string;
          sectioningMethod?: string | null;
          generationStatus?: 'pending' | 'ready' | 'failed';
          createdAt?: FirebaseFirestore.Timestamp;
        };

        const sectionsSnapshot = await db.collection('books').doc(doc.id).collection('sections').get();
        const sectionsTotal = sectionsSnapshot.docs.length;
        const sectionsUnlocked = sectionsSnapshot.docs.filter((sectionDoc) => {
          const sectionData = sectionDoc.data() as { status: string };
          return UNLOCKED_STATUSES.has(sectionData.status);
        }).length;

        // Minor #5: an uploaded book has zero sections until its
        // deferred-sectioning setup is finalized (sectioningMethod set from
        // null to a real method) — show "Not yet started" for it instead of
        // the misleading "0 of 0 sections unlocked".
        const needsSetup = data.source === 'uploaded' && data.sectioningMethod == null;

        // Fix 6: display-only override — a 'pending' book whose createdAt is
        // more than 5 minutes old is shown as 'failed', without touching
        // Firestore.
        const generationStatus =
          data.generationStatus === 'pending' && isPendingStale(data.createdAt)
            ? 'failed'
            : data.generationStatus;

        return {
          id: doc.id,
          title: data.title,
          author: data.author ?? null,
          language: data.language,
          sectionsTotal,
          sectionsUnlocked,
          needsSetup,
          generationStatus,
        };
      })
    );
  });
}
