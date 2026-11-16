import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({ getAdminApp: vi.fn(() => ({})) }));

import { getFirestore } from 'firebase-admin/firestore';
import { getStatisticsByLanguage } from './statsService';

const mockGetFirestore = getFirestore as unknown as ReturnType<typeof vi.fn>;

type WordRow = { userId: string; language: string; lastRating: string | null };
type BookRow = { id: string; userId: string; title: string; language: string };
type SectionRow = { status: string };

// A minimal fake Firestore supporting exactly what getStatisticsByLanguage
// needs: a single-field equality query over the top-level `words` and
// `books` collections (both filtered by `userId`), plus a plain `.get()`
// over each book's `sections` subcollection.
function createFakeFirestore(
  words: WordRow[],
  books: BookRow[],
  sectionsByBookId: Record<string, SectionRow[]>
) {
  const db = {
    collection(name: string) {
      if (name === 'words') {
        return {
          where(field: string, op: string, value: unknown) {
            if (field !== 'userId' || op !== '==') {
              throw new Error(`Unsupported filter in fake: ${field} ${op}`);
            }
            return {
              async get() {
                const docs = words
                  .filter((w) => w.userId === value)
                  .map((w) => ({ data: () => ({ ...w }) }));
                return { empty: docs.length === 0, docs };
              },
            };
          },
        };
      }

      if (name === 'books') {
        return {
          where(field: string, op: string, value: unknown) {
            if (field !== 'userId' || op !== '==') {
              throw new Error(`Unsupported filter in fake: ${field} ${op}`);
            }
            return {
              async get() {
                const docs = books
                  .filter((b) => b.userId === value)
                  .map((b) => ({ id: b.id, data: () => ({ ...b }) }));
                return { empty: docs.length === 0, docs };
              },
            };
          },
          doc(id: string) {
            return {
              collection(sub: string) {
                if (sub !== 'sections') throw new Error(`Unexpected subcollection: ${sub}`);
                return {
                  async get() {
                    const sections = sectionsByBookId[id] ?? [];
                    const docs = sections.map((s) => ({ data: () => ({ ...s }) }));
                    return { empty: docs.length === 0, docs };
                  },
                };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected top-level collection: ${name}`);
    },
  };

  return db;
}

beforeEach(() => {
  mockGetFirestore.mockReset();
});

describe('getStatisticsByLanguage', () => {
  test('groups mastered-word counts by language', async () => {
    const db = createFakeFirestore(
      [
        { userId: 'user-1', language: 'english', lastRating: 'good' },
        { userId: 'user-1', language: 'english', lastRating: null },
        { userId: 'user-1', language: 'spanish', lastRating: 'easy' },
      ],
      [],
      {}
    );
    mockGetFirestore.mockReturnValue(db);

    const stats = await getStatisticsByLanguage('user-1');

    const english = stats.find((s) => s.language === 'english');
    const spanish = stats.find((s) => s.language === 'spanish');
    expect(english?.wordsMastered).toBe(1);
    expect(spanish?.wordsMastered).toBe(1);
  });

  test('reports per-book section completion within each language', async () => {
    const db = createFakeFirestore(
      [],
      [{ id: 'book-1', userId: 'user-1', title: 'Four Seasons', language: 'english' }],
      {
        'book-1': [
          { status: 'completed' },
          { status: 'completed' },
          { status: 'ready_to_read' },
          { status: 'locked' },
        ],
      }
    );
    mockGetFirestore.mockReturnValue(db);

    const stats = await getStatisticsByLanguage('user-1');

    const english = stats.find((s) => s.language === 'english');
    expect(english?.books).toEqual([
      { id: 'book-1', title: 'Four Seasons', completedSections: 2, totalSections: 4 },
    ]);
  });

  test('only "good" or "easy" count as mastered; other ratings (including "again"/"hard") do not', async () => {
    const db = createFakeFirestore(
      [
        { userId: 'user-1', language: 'english', lastRating: 'again' },
        { userId: 'user-1', language: 'english', lastRating: 'hard' },
        { userId: 'user-1', language: 'english', lastRating: 'easy' },
      ],
      [],
      {}
    );
    mockGetFirestore.mockReturnValue(db);

    const stats = await getStatisticsByLanguage('user-1');

    expect(stats.find((s) => s.language === 'english')?.wordsMastered).toBe(1);
  });

  test('a language with books but no mastered words still appears, with wordsMastered 0', async () => {
    const db = createFakeFirestore(
      [],
      [{ id: 'book-1', userId: 'user-1', title: 'Unread Yet', language: 'french' }],
      { 'book-1': [{ status: 'locked' }] }
    );
    mockGetFirestore.mockReturnValue(db);

    const stats = await getStatisticsByLanguage('user-1');

    const french = stats.find((s) => s.language === 'french');
    expect(french?.wordsMastered).toBe(0);
    expect(french?.books).toEqual([{ id: 'book-1', title: 'Unread Yet', completedSections: 0, totalSections: 1 }]);
  });

  test('a language with mastered words but no books still appears, with an empty books list', async () => {
    // e.g. every word in this language was added via the reader's
    // "Add to my vocabulary" button, never through a book.
    const db = createFakeFirestore(
      [{ userId: 'user-1', language: 'german', lastRating: 'good' }],
      [],
      {}
    );
    mockGetFirestore.mockReturnValue(db);

    const stats = await getStatisticsByLanguage('user-1');

    const german = stats.find((s) => s.language === 'german');
    expect(german?.wordsMastered).toBe(1);
    expect(german?.books).toEqual([]);
  });

  test('never queries another user\'s words or books', async () => {
    const db = createFakeFirestore(
      [
        { userId: 'user-1', language: 'english', lastRating: 'good' },
        { userId: 'user-2', language: 'english', lastRating: 'good' },
      ],
      [{ id: 'book-1', userId: 'user-2', title: 'Not Mine', language: 'english' }],
      { 'book-1': [{ status: 'completed' }] }
    );
    mockGetFirestore.mockReturnValue(db);

    const stats = await getStatisticsByLanguage('user-1');

    const english = stats.find((s) => s.language === 'english');
    expect(english?.wordsMastered).toBe(1);
    expect(english?.books).toEqual([]);
  });
});
