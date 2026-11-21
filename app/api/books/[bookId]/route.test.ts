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
  deleteBook: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuthedUser } from '@/lib/firebase/server';
import { deleteBook } from '@/lib/books/bookService';
import { DELETE } from './route';

const mockGetFirestore = getFirestore as unknown as ReturnType<typeof vi.fn>;
const mockGetAuthedUser = getAuthedUser as unknown as ReturnType<typeof vi.fn>;
const mockDeleteBook = deleteBook as unknown as ReturnType<typeof vi.fn>;

type StoredDoc = Record<string, unknown>;

// Same minimal fake-Firestore style as the sectioning route's own test
// (app/api/books/[bookId]/sectioning/route.test.ts) — only books/{bookId}.get()
// is needed here, since the actual deletion is delegated to (and mocked at)
// bookService.deleteBook.
function createFakeFirestore() {
  const store = new Map<string, StoredDoc>();

  function makeDocRef(path: string): any {
    return {
      path,
      async get() {
        const data = store.get(path);
        return {
          exists: data !== undefined,
          data: () => (data ? { ...data } : undefined),
        };
      },
    };
  }

  function makeCollectionRef(path: string): any {
    return {
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

function makeRequest(bookId: string) {
  return new NextRequest(`http://localhost/api/books/${bookId}`, { method: 'DELETE' });
}

function makeParams(bookId: string) {
  return { params: Promise.resolve({ bookId }) };
}

beforeEach(() => {
  mockGetFirestore.mockReset();
  mockGetAuthedUser.mockReset();
  mockDeleteBook.mockReset();
});

describe('DELETE /api/books/[bookId]', () => {
  test('returns 401 when not authenticated', async () => {
    mockGetAuthedUser.mockResolvedValue(null);

    const response = await DELETE(makeRequest('book-1'), makeParams('book-1'));

    expect(response.status).toBe(401);
    expect(mockDeleteBook).not.toHaveBeenCalled();
  });

  test('returns 404 when the book does not exist', async () => {
    const { db } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const response = await DELETE(makeRequest('missing-book'), makeParams('missing-book'));

    expect(response.status).toBe(404);
    expect(mockDeleteBook).not.toHaveBeenCalled();
  });

  // Mirrors the sectioning route's own documented choice: a non-owned book
  // returns 404, not 403, so as not to reveal whether a given bookId exists
  // for another user.
  test('returns 404 (not 403) when the book belongs to a different user', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    putBook(store, 'book-1', { userId: 'someone-else' });

    const response = await DELETE(makeRequest('book-1'), makeParams('book-1'));

    expect(response.status).toBe(404);
    expect(mockDeleteBook).not.toHaveBeenCalled();
  });

  test('deletes the book and returns 200 when the authed user owns it', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    putBook(store, 'book-1', { userId: 'user-1' });
    mockDeleteBook.mockResolvedValue(undefined);

    const response = await DELETE(makeRequest('book-1'), makeParams('book-1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(mockDeleteBook).toHaveBeenCalledWith({ bookId: 'book-1', userId: 'user-1' });
  });
});
