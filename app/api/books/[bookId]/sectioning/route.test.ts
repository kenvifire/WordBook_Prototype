// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({ getAdminApp: vi.fn(() => ({})) }));

vi.mock('@/lib/firebase/server', () => ({
  getAuthedUser: vi.fn(),
}));

vi.mock('@/lib/books/bookService', () => ({
  finalizeSectioning: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuthedUser } from '@/lib/firebase/server';
import { finalizeSectioning } from '@/lib/books/bookService';
import { POST } from './route';

const mockGetFirestore = getFirestore as unknown as ReturnType<typeof vi.fn>;
const mockGetAuthedUser = getAuthedUser as unknown as ReturnType<typeof vi.fn>;
const mockFinalizeSectioning = finalizeSectioning as unknown as ReturnType<typeof vi.fn>;

type StoredDoc = Record<string, unknown>;

// Minimal fake Firestore, backed by an in-memory Map keyed by document path,
// supporting exactly what this route needs: books/{bookId}.get() — mirroring
// the fake-store style already used in app/api/words/[wordId]/rate/route.test.ts.
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

function putBook(store: Map<string, StoredDoc>, bookId: string, data: StoredDoc) {
  store.set(`books/${bookId}`, { ...data });
}

function makeRequest(bookId: string, body: unknown) {
  return new NextRequest(`http://localhost/api/books/${bookId}/sectioning`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function makeParams(bookId: string) {
  return { params: Promise.resolve({ bookId }) };
}

beforeEach(() => {
  mockGetFirestore.mockReset();
  mockGetAuthedUser.mockReset();
  mockFinalizeSectioning.mockReset();
});

describe('POST /api/books/[bookId]/sectioning', () => {
  test('calls finalizeSectioning with the given method and pagesPerSection, scoped to the owning user', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    putBook(store, 'book-1', { userId: 'user-1' });
    mockFinalizeSectioning.mockResolvedValue(undefined);

    const response = await POST(
      makeRequest('book-1', { method: 'by_page', pagesPerSection: 3 }),
      makeParams('book-1')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockFinalizeSectioning).toHaveBeenCalledWith({
      bookId: 'book-1',
      userId: 'user-1',
      method: 'by_page',
      pagesPerSection: 3,
    });
  });

  test('calls finalizeSectioning with method by_chapter and no pagesPerSection', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    putBook(store, 'book-1', { userId: 'user-1' });
    mockFinalizeSectioning.mockResolvedValue(undefined);

    const response = await POST(
      makeRequest('book-1', { method: 'by_chapter' }),
      makeParams('book-1')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockFinalizeSectioning).toHaveBeenCalledWith({
      bookId: 'book-1',
      userId: 'user-1',
      method: 'by_chapter',
      pagesPerSection: undefined,
    });
  });

  test('rejects a request from a user who does not own the book (404, matching existing ownership-check style)', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-2' });
    putBook(store, 'book-1', { userId: 'user-1' });

    const response = await POST(
      makeRequest('book-1', { method: 'by_page', pagesPerSection: 1 }),
      makeParams('book-1')
    );

    expect(response.status).toBe(404);
    expect(mockFinalizeSectioning).not.toHaveBeenCalled();
  });

  test('returns 404 for a non-existent book', async () => {
    const { db } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const response = await POST(
      makeRequest('no-such-book', { method: 'by_page', pagesPerSection: 1 }),
      makeParams('no-such-book')
    );

    expect(response.status).toBe(404);
    expect(mockFinalizeSectioning).not.toHaveBeenCalled();
  });

  test('returns 400 for an invalid method', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    putBook(store, 'book-1', { userId: 'user-1' });

    const response = await POST(
      makeRequest('book-1', { method: 'by_magic' }),
      makeParams('book-1')
    );

    expect(response.status).toBe(400);
    expect(mockFinalizeSectioning).not.toHaveBeenCalled();
  });

  test('returns 401 when there is no authenticated user', async () => {
    mockGetAuthedUser.mockResolvedValue(null);

    const response = await POST(
      makeRequest('book-1', { method: 'by_page', pagesPerSection: 1 }),
      makeParams('book-1')
    );

    expect(response.status).toBe(401);
    expect(mockFinalizeSectioning).not.toHaveBeenCalled();
  });
});
