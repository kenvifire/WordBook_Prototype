// @vitest-environment node
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({ getAdminApp: vi.fn(() => ({})) }));

vi.mock('@/lib/firebase/server', () => ({
  getAuthedUser: vi.fn(),
}));

vi.mock('@/lib/dictionary/dictionaryApi', () => ({
  fetchDefinition: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuthedUser } from '@/lib/firebase/server';
import { fetchDefinition } from '@/lib/dictionary/dictionaryApi';
import { POST } from './route';

const mockGetFirestore = getFirestore as unknown as ReturnType<typeof vi.fn>;
const mockGetAuthedUser = getAuthedUser as unknown as ReturnType<typeof vi.fn>;
const mockFetchDefinition = fetchDefinition as unknown as ReturnType<typeof vi.fn>;

type StoredDoc = Record<string, unknown>;

// A fake Firestore backed by a real in-memory Map keyed by full document
// path, faithfully reproducing the semantics this route's race-safety
// depends on: `.create()` throws synchronously (no await between the
// existence check and the write) with a numeric `.code === 6` when a
// document already exists at that path — mirroring
// lib/books/bookService.test.ts's fake, which exercises the exact same
// create()-based race.
function createFakeFirestore() {
  const store = new Map<string, StoredDoc>();
  const createCallCount = new Map<string, number>();

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
      async create(data: Record<string, unknown>) {
        createCallCount.set(path, (createCallCount.get(path) ?? 0) + 1);
        if (store.has(path)) {
          const err: Error & { code?: number } = new Error(
            `6 ALREADY_EXISTS: Document already exists: ${path}`
          );
          err.code = 6;
          throw err;
        }
        store.set(path, { ...data });
        return {};
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

  return { db, store, createCallCount };
}

function putWord(store: Map<string, StoredDoc>, wordId: string, data: StoredDoc) {
  store.set(`words/${wordId}`, { ...data });
}

function getWord(store: Map<string, StoredDoc>, wordId: string) {
  return store.get(`words/${wordId}`) as any;
}

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/words/lookup', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockGetFirestore.mockReset();
  mockGetAuthedUser.mockReset();
  mockFetchDefinition.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('POST /api/words/lookup', () => {
  test('returns 401 when there is no authenticated user', async () => {
    mockGetAuthedUser.mockResolvedValue(null);
    const { db } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);

    const response = await POST(makeRequest({ word: 'ephemeral' }));

    expect(response.status).toBe(401);
    expect(mockFetchDefinition).not.toHaveBeenCalled();
  });

  test('returns 400 when the word is missing or has no letters', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    const { db } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);

    const response = await POST(makeRequest({ word: '  123  ' }));

    expect(response.status).toBe(400);
    expect(mockFetchDefinition).not.toHaveBeenCalled();
  });

  test('a plain lookup (no add flag) never creates a word doc, even for a brand-new word', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockFetchDefinition.mockResolvedValue('lasting a short time');

    const response = await POST(makeRequest({ word: 'Ephemeral,' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockFetchDefinition).toHaveBeenCalledWith('ephemeral');
    expect(body).toEqual({ word: 'ephemeral', definition: 'lasting a short time' });
    expect(getWord(store, 'user-1_ephemeral')).toBeUndefined();
  });

  test('add: true creates a new word doc with SM-2 defaults and no bookId/sectionRefs', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockFetchDefinition.mockResolvedValue('lasting a short time');

    const response = await POST(makeRequest({ word: 'Ephemeral,', add: true }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockFetchDefinition).toHaveBeenCalledWith('ephemeral');
    expect(body).toEqual({ word: 'ephemeral', definition: 'lasting a short time' });

    const stored = getWord(store, 'user-1_ephemeral');
    expect(stored).toMatchObject({
      userId: 'user-1',
      word: 'ephemeral',
      definition: 'lasting a short time',
      sectionRefs: [],
      repetitions: 0,
      easeFactor: 2.5,
      intervalDays: 1,
      nextReviewDate: '2026-01-01',
      lastRating: null,
    });
    expect(stored.bookId).toBeUndefined();
  });

  test('a word the user already has returns its existing definition without re-fetching or overwriting', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    putWord(store, 'user-1_lucid', {
      userId: 'user-1',
      word: 'lucid',
      definition: 'clear and easy to understand',
      sectionRefs: [{ bookId: 'book-1', sectionId: 'section-1' }],
      repetitions: 3,
      easeFactor: 2.8,
      intervalDays: 15,
      nextReviewDate: '2026-01-05',
      lastRating: 'good',
    });

    const response = await POST(makeRequest({ word: 'lucid' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockFetchDefinition).not.toHaveBeenCalled();
    expect(body).toEqual({ word: 'lucid', definition: 'clear and easy to understand' });
    expect(getWord(store, 'user-1_lucid')).toMatchObject({
      repetitions: 3,
      easeFactor: 2.8,
      intervalDays: 15,
    });
  });

  test('a stored null definition is retried and backfilled without touching SRS state', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    putWord(store, 'user-1_zzzqaa', {
      userId: 'user-1',
      word: 'zzzqaa',
      definition: null,
      sectionRefs: [],
      repetitions: 4,
      easeFactor: 2.9,
      intervalDays: 30,
      nextReviewDate: '2026-01-10',
      lastRating: 'easy',
    });
    mockFetchDefinition.mockResolvedValue('a definition at last');

    const response = await POST(makeRequest({ word: 'zzzqaa' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockFetchDefinition).toHaveBeenCalledWith('zzzqaa');
    expect(body).toEqual({ word: 'zzzqaa', definition: 'a definition at last' });
    expect(getWord(store, 'user-1_zzzqaa')).toMatchObject({
      definition: 'a definition at last',
      repetitions: 4,
      easeFactor: 2.9,
      intervalDays: 30,
      lastRating: 'easy',
    });
  });

  test('a stored null definition that still fails to resolve stays null and is not written', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    putWord(store, 'user-1_zzzqbb', {
      userId: 'user-1',
      word: 'zzzqbb',
      definition: null,
      sectionRefs: [],
      repetitions: 0,
      easeFactor: 2.5,
      intervalDays: 1,
      nextReviewDate: '2026-01-01',
      lastRating: null,
    });
    mockFetchDefinition.mockResolvedValue(null);

    const response = await POST(makeRequest({ word: 'zzzqbb' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ word: 'zzzqbb', definition: null });
    expect(getWord(store, 'user-1_zzzqbb')).toMatchObject({ definition: null });
  });

  test("two concurrent add:true calls for the same new word result in one document; the loser transparently gets the winner's data instead of a 500", async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    const { db, store, createCallCount } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockFetchDefinition.mockResolvedValue('lasting a short time');

    const [firstResponse, secondResponse] = await Promise.all([
      POST(makeRequest({ word: 'ephemeral', add: true })),
      POST(makeRequest({ word: 'ephemeral', add: true })),
    ]);

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);

    const firstBody = await firstResponse.json();
    const secondBody = await secondResponse.json();

    expect(firstBody).toEqual({ word: 'ephemeral', definition: 'lasting a short time' });
    expect(secondBody).toEqual({ word: 'ephemeral', definition: 'lasting a short time' });

    // Only one document ever landed, and both create() attempts were made
    // (proving the loser actually hit the race rather than short-circuiting
    // some other way).
    expect(createCallCount.get('words/user-1_ephemeral')).toBe(2);
    expect(getWord(store, 'user-1_ephemeral')).toMatchObject({
      userId: 'user-1',
      word: 'ephemeral',
      definition: 'lasting a short time',
      sectionRefs: [],
      repetitions: 0,
    });
  });

  test('a non-race error from create() surfaces as a 500', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    const { db } = createFakeFirestore();
    const failingDb = {
      collection: (name: string) => {
        const real = db.collection(name);
        return {
          ...real,
          doc(id: string) {
            const ref = real.doc(id);
            return {
              ...ref,
              async create() {
                throw new Error('boom');
              },
            };
          },
        };
      },
    };
    mockGetFirestore.mockReturnValue(failingDb);
    mockFetchDefinition.mockResolvedValue('lasting a short time');

    const response = await POST(makeRequest({ word: 'ephemeral', add: true }));

    expect(response.status).toBe(500);
  });
});
