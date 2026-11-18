import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';

export type LanguageStats = {
  language: string;
  wordsMastered: number;
  books: { id: string; title: string; completedSections: number; totalSections: number }[];
};

// "Mastered" is defined project-wide (see AGENTS.md / this plan's Global
// Constraints) as: a word's most recent rating was 'good' or 'easy' — the
// same signal the per-section recognition gate already uses
// (lib/sections/sectionService.ts's computeRecognitionRate), just counted
// globally per language here instead of per section. Do not swap this for
// a different threshold (e.g. repetitions or easeFactor).
function isMastered(lastRating: string | null): boolean {
  return lastRating === 'good' || lastRating === 'easy';
}

// Both queries below filter by `userId` (the Admin-SDK-only rule's required
// per-query uid filter) — never anyone else's words or books.
export async function getStatisticsByLanguage(userId: string): Promise<LanguageStats[]> {
  const db = getFirestore(getAdminApp());

  const wordsSnapshot = await db.collection('words').where('userId', '==', userId).get();
  const masteredByLanguage = new Map<string, number>();
  for (const doc of wordsSnapshot.docs) {
    const data = doc.data() as { language: string; lastRating: string | null };
    if (isMastered(data.lastRating)) {
      masteredByLanguage.set(data.language, (masteredByLanguage.get(data.language) ?? 0) + 1);
    }
  }

  const booksSnapshot = await db.collection('books').where('userId', '==', userId).get();
  const booksByLanguage = new Map<string, LanguageStats['books']>();

  for (const bookDoc of booksSnapshot.docs) {
    const bookData = bookDoc.data() as { title: string; language: string };

    const sectionsSnapshot = await db
      .collection('books')
      .doc(bookDoc.id)
      .collection('sections')
      .get();
    const totalSections = sectionsSnapshot.docs.length;
    const completedSections = sectionsSnapshot.docs.filter((sectionDoc) => {
      const sectionData = sectionDoc.data() as { status: string };
      return sectionData.status === 'completed';
    }).length;

    const list = booksByLanguage.get(bookData.language) ?? [];
    list.push({ id: bookDoc.id, title: bookData.title, completedSections, totalSections });
    booksByLanguage.set(bookData.language, list);
  }

  const languages = new Set<string>([...masteredByLanguage.keys(), ...booksByLanguage.keys()]);

  return Array.from(languages)
    .sort()
    .map((language) => ({
      language,
      wordsMastered: masteredByLanguage.get(language) ?? 0,
      books: booksByLanguage.get(language) ?? [],
    }));
}
