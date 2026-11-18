import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/firebase/admin', () => ({
  getAdminApp: vi.fn(() => ({})),
}));

vi.mock('firebase-admin/storage', () => ({
  getStorage: vi.fn(),
}));

import { getStorage } from 'firebase-admin/storage';
import {
  savePendingBookText,
  readPendingBookText,
  deletePendingBookText,
} from './pendingBookText';

const mockGetStorage = getStorage as unknown as ReturnType<typeof vi.fn>;

// In-memory fake blob store, keyed by storage path, matching the style used
// by this repo's other Storage-touching tests (app/api/settings/avatar) but
// backed by a real map so save/download/delete round-trip against each other
// instead of being stubbed individually per test.
function makeFakeBucket() {
  const blobs = new Map<string, Buffer>();

  const file = vi.fn((path: string) => ({
    save: vi.fn(async (buffer: Buffer) => {
      blobs.set(path, buffer);
    }),
    download: vi.fn(async () => {
      if (!blobs.has(path)) {
        const error = new Error(`No such object: fake-bucket/${path}`) as Error & {
          code?: number;
        };
        error.code = 404;
        throw error;
      }
      return [blobs.get(path) as Buffer];
    }),
    delete: vi.fn(async (options?: { ignoreNotFound?: boolean }) => {
      if (!blobs.has(path)) {
        if (options?.ignoreNotFound) {
          return;
        }
        const error = new Error(`No such object: fake-bucket/${path}`) as Error & {
          code?: number;
        };
        error.code = 404;
        throw error;
      }
      blobs.delete(path);
    }),
  }));

  const bucket = vi.fn(() => ({ file }));
  return { bucket, file, blobs };
}

beforeEach(() => {
  mockGetStorage.mockReset();
});

describe('pendingBookText', () => {
  test('round-trips text through save then read', async () => {
    const fakeBucket = makeFakeBucket();
    mockGetStorage.mockReturnValue(fakeBucket);

    await savePendingBookText('user-1', 'book-1', 'the quick brown fox');
    const text = await readPendingBookText('user-1', 'book-1');

    expect(text).toBe('the quick brown fox');
    expect(fakeBucket.file).toHaveBeenCalledWith('pending-books/user-1/book-1.txt');
  });

  test('deletePendingBookText does not throw when the blob is already gone', async () => {
    const fakeBucket = makeFakeBucket();
    mockGetStorage.mockReturnValue(fakeBucket);

    await expect(deletePendingBookText('user-1', 'book-missing')).resolves.toBeUndefined();
  });

  test('readPendingBookText throws a clear error when nothing was ever saved', async () => {
    const fakeBucket = makeFakeBucket();
    mockGetStorage.mockReturnValue(fakeBucket);

    await expect(readPendingBookText('user-1', 'book-never-saved')).rejects.toThrow();
  });
});
