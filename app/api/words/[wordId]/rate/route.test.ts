// @vitest-environment node
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({ getAdminApp: vi.fn(() => ({})) }));

vi.mock('@/lib/firebase/server', () => ({
  getAuthedUser: vi.fn(),
}));

vi.mock('@/lib/sections/sectionService', () => ({
  maybeUnlockNextSection: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuthedUser } from '@/lib/firebase/server';
import { maybeUnlockNextSection } from '@/lib/sections/sectionService';
import { POST } from './route';

const mockGetFirestore = getFirestore as unknown as ReturnType<typeof vi.fn>;
const mockGetAuthedUser = getAuthedUser as unknown as ReturnType<typeof vi.fn>;
const mockMaybeUnlockNextSection = maybeUnlockNextSection as unknown as ReturnType<typeof vi.fn>;

type StoredDoc = Record<string, unknown>;

// A minimal fake Firestore, backed by an in-memory Map keyed by document
// path, supporting exactly the operations the rate route needs: doc
// get/update — mirroring the fake-store style already used in
// lib/sections/sectionService.test.ts and lib/books/bookService.test.ts.
function createFakeFirestore() {
  const store = new Map<string, StoredDoc>();

  function makeDocRef(path: string): any {
    const id = path.split('/').pop()!;
    return {
      id,
      path,
      async get() {
        const data = store.get(path);
        return {
          exists: data !== undefined,
          id,
          data: () => (data ? { ...data } : undefined),
        };
      },
      async update(data: Record<string, unknown>) {
        const existing = store.get(path);
        if (!existing) {
          throw new Error(`No document to update at ${path}`);
        }
        store.set(path, { ...existing, ...data });
      },
    };
  }

  function makeCollectionRef(path: string): any {
    return {
      path,
      doc(id: string) {
        return makeDocRef(`${path}/${id}`);
      },
    };
  }

  const db = {
    collection(name: string) {
      return makeCollectionRef(name);
    },
  };

  return { db, store };
}

function putWord(store: Map<string, StoredDoc>, wordId: string, data: StoredDoc) {
  store.set(`words/${wordId}`, { ...data });
}

function getWord(store: Map<string, StoredDoc>, wordId: string) {
  return store.get(`words/${wordId}`) as any;
}

function makeRequest(wordId: string, body: unknown) {
  return new NextRequest(`http://localhost/api/words/${wordId}/rate`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function baseWord(overrides: Partial<StoredDoc> = {}): StoredDoc {
  return {
    userId: 'user-1',
    word: 'ephemeral',
    definition: 'lasting a short time',
    sectionRefs: [
      { bookId: 'book-1', sectionId: 'section-1' },
      { bookId: 'book-1', sectionId: 'section-2' },
    ],
    repetitions: 2,
    easeFactor: 2.0,
    intervalDays: 10,
    nextReviewDate: '2026-01-01',
    lastRating: 'good',
    ...overrides,
  };
}

beforeEach(() => {
  mockGetFirestore.mockReset();
  mockGetAuthedUser.mockReset();
  mockMaybeUnlockNextSection.mockReset();
  // applyRating's nextReviewDate is derived from `new Date()` inside the
  // route, so the system clock is pinned for deterministic assertions.
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('POST /api/words/[wordId]/rate', () => {
  test('applies the rating, persists the new state, and triggers unlock checks for every section in sectionRefs', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    putWord(store, 'word-1', baseWord());

    const response = await POST(makeRequest('word-1', { rating: 'good' }), {
      params: Promise.resolve({ wordId: 'word-1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getWord(store, 'word-1')).toMatchObject({
      repetitions: 3,
      easeFactor: 2.0,
      intervalDays: 20,
      nextReviewDate: '2026-01-21',
      lastRating: 'good',
    });
    expect(body).toMatchObject({
      id: 'word-1',
      repetitions: 3,
      easeFactor: 2.0,
      intervalDays: 20,
      nextReviewDate: '2026-01-21',
      lastRating: 'good',
    });

    expect(mockMaybeUnlockNextSection).toHaveBeenCalledTimes(2);
    expect(mockMaybeUnlockNextSection).toHaveBeenCalledWith('book-1', 'section-1');
    expect(mockMaybeUnlockNextSection).toHaveBeenCalledWith('book-1', 'section-2');
  });

  test('rating an unknown or not-owned wordId returns 404', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const missingResponse = await POST(makeRequest('missing-word', { rating: 'good' }), {
      params: Promise.resolve({ wordId: 'missing-word' }),
    });
    expect(missingResponse.status).toBe(404);
    expect(mockMaybeUnlockNextSection).not.toHaveBeenCalled();

    putWord(store, 'word-2', baseWord({ userId: 'other-user' }));
    const notOwnedResponse = await POST(makeRequest('word-2', { rating: 'good' }), {
      params: Promise.resolve({ wordId: 'word-2' }),
    });
    expect(notOwnedResponse.status).toBe(404);
    expect(getWord(store, 'word-2')).toMatchObject({ repetitions: 2 });
    expect(mockMaybeUnlockNextSection).not.toHaveBeenCalled();
  });

  test('returns 401 when there is no authenticated user', async () => {
    const { db } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue(null);

    const response = await POST(makeRequest('word-1', { rating: 'good' }), {
      params: Promise.resolve({ wordId: 'word-1' }),
    });

    expect(response.status).toBe(401);
  });

  test('returns 400 for a rating outside again/hard/good/easy, before any write', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    putWord(store, 'word-1', baseWord());

    const response = await POST(makeRequest('word-1', { rating: 'excellent' }), {
      params: Promise.resolve({ wordId: 'word-1' }),
    });

    expect(response.status).toBe(400);
    expect(getWord(store, 'word-1')).toMatchObject({ repetitions: 2 });
    expect(mockMaybeUnlockNextSection).not.toHaveBeenCalled();
  });

  test('a malformed request body returns 400, not 500', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    putWord(store, 'word-1', baseWord());

    const request = new NextRequest('http://localhost/api/words/word-1/rate', {
      method: 'POST',
      body: 'not valid json{{{',
    });

    const response = await POST(request, { params: Promise.resolve({ wordId: 'word-1' }) });

    expect(response.status).toBe(400);
    expect(getWord(store, 'word-1')).toMatchObject({ repetitions: 2 });
    expect(mockMaybeUnlockNextSection).not.toHaveBeenCalled();
  });

  test('an unlock-check failure after a successful word update is logged, not returned as an error (no double-apply risk on client retry)', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    putWord(store, 'word-1', baseWord({ sectionRefs: [{ bookId: 'book-1', sectionId: 'section-1' }] }));
    mockMaybeUnlockNextSection.mockRejectedValue(new Error('boom'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const response = await POST(makeRequest('word-1', { rating: 'good' }), {
      params: Promise.resolve({ wordId: 'word-1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getWord(store, 'word-1')).toMatchObject({ repetitions: 3 });
    expect(body).toMatchObject({ id: 'word-1', repetitions: 3 });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
