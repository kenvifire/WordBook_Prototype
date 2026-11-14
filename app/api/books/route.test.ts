// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/firebase/server', () => ({
  getAuthedUser: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  getAdminApp: vi.fn(() => ({})),
}));

vi.mock('firebase-admin/storage', () => ({
  getStorage: vi.fn(),
}));

vi.mock('@/lib/epub/parseEpub', () => ({
  parseEpub: vi.fn(),
}));

vi.mock('@/lib/books/bookService', () => ({
  addBook: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { getAuthedUser } from '@/lib/firebase/server';
import { getStorage } from 'firebase-admin/storage';
import { parseEpub } from '@/lib/epub/parseEpub';
import { addBook } from '@/lib/books/bookService';
import { POST } from './route';

const mockGetAuthedUser = getAuthedUser as unknown as ReturnType<typeof vi.fn>;
const mockGetStorage = getStorage as unknown as ReturnType<typeof vi.fn>;
const mockParseEpub = parseEpub as unknown as ReturnType<typeof vi.fn>;
const mockAddBook = addBook as unknown as ReturnType<typeof vi.fn>;

function makeStorageMock(save: ReturnType<typeof vi.fn>) {
  const file = vi.fn((_path: string) => ({ save }));
  const bucket = vi.fn(() => ({ file }));
  return { bucket, file };
}

function makeRequest(formData: FormData) {
  return new NextRequest('http://localhost/api/books', {
    method: 'POST',
    body: formData,
  });
}

beforeEach(() => {
  mockGetAuthedUser.mockReset();
  mockGetStorage.mockReset();
  mockParseEpub.mockReset();
  mockAddBook.mockReset();
});

describe('POST /api/books', () => {
  test('with { title, format: "text", rawText } calls addBook and returns 201 with the new bookId', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    mockAddBook.mockResolvedValue({ bookId: 'book-123' });

    const formData = new FormData();
    formData.set('title', 'My Book');
    formData.set('format', 'text');
    formData.set('rawText', 'some plain text content');

    const response = await POST(makeRequest(formData));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({ bookId: 'book-123' });
    expect(mockAddBook).toHaveBeenCalledWith({
      title: 'My Book',
      author: undefined,
      format: 'text',
      rawText: 'some plain text content',
      userId: 'user-1',
    });
    expect(mockParseEpub).not.toHaveBeenCalled();
    expect(mockGetStorage).not.toHaveBeenCalled();
  });

  test('with format: "epub" parses the uploaded file via parseEpub before calling addBook, and uploads it to Storage', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    mockParseEpub.mockResolvedValue({ title: 'EPUB Title', author: 'EPUB Author', text: 'flattened text' });
    mockAddBook.mockResolvedValue({ bookId: 'book-456' });
    const save = vi.fn().mockResolvedValue(undefined);
    const storage = makeStorageMock(save);
    mockGetStorage.mockReturnValue(storage);

    const formData = new FormData();
    const file = new File(['fake epub bytes'], 'book.epub', { type: 'application/epub+zip' });
    formData.set('file', file);

    const response = await POST(makeRequest(formData));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({ bookId: 'book-456' });
    expect(mockParseEpub).toHaveBeenCalledTimes(1);
    const bufferArg = mockParseEpub.mock.calls[0][0];
    expect(Buffer.isBuffer(bufferArg)).toBe(true);
    expect(mockAddBook).toHaveBeenCalledWith({
      title: 'EPUB Title',
      author: 'EPUB Author',
      format: 'epub',
      rawText: 'flattened text',
      userId: 'user-1',
    });

    // Uploaded to the epubs/{userId}/{uuid}.epub path convention, via the
    // Admin SDK's Storage bucket.
    expect(storage.file).toHaveBeenCalledTimes(1);
    const filePath = storage.file.mock.calls[0][0] as string;
    expect(filePath).toMatch(/^epubs\/user-1\/[0-9a-f-]+\.epub$/);
    expect(save).toHaveBeenCalledWith(bufferArg, { contentType: 'application/epub+zip' });
  });

  test('an unparseable EPUB upload returns 400, not 500', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    mockParseEpub.mockRejectedValue(new Error('Could not parse EPUB file'));

    const formData = new FormData();
    const file = new File(['not a real epub'], 'broken.epub', { type: 'application/epub+zip' });
    formData.set('file', file);

    const response = await POST(makeRequest(formData));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Could not parse EPUB file' });
    expect(mockAddBook).not.toHaveBeenCalled();
    // Parsing happens before the Storage upload, so a failed parse never
    // leaves an orphaned file behind in Storage.
    expect(mockGetStorage).not.toHaveBeenCalled();
  });

  test('uploads the EPUB to Storage only after a successful parse, and a Storage failure is logged, not fatal', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    mockParseEpub.mockResolvedValue({ title: 'EPUB Title', author: 'EPUB Author', text: 'flattened text' });
    mockAddBook.mockResolvedValue({ bookId: 'book-456' });
    const save = vi.fn().mockRejectedValue(new Error('bucket unavailable'));
    const storage = makeStorageMock(save);
    mockGetStorage.mockReturnValue(storage);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const formData = new FormData();
    const file = new File(['fake epub bytes'], 'book.epub', { type: 'application/epub+zip' });
    formData.set('file', file);

    const response = await POST(makeRequest(formData));
    const body = await response.json();

    // A Storage upload failure is logged, not fatal: parsing already
    // succeeded, so the request still completes successfully.
    expect(response.status).toBe(201);
    expect(body).toEqual({ bookId: 'book-456' });
    expect(save).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  test('a non-.epub file is rejected with 400 instead of being silently ignored', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const formData = new FormData();
    const file = new File(['just some bytes'], 'notes.txt', { type: 'text/plain' });
    formData.set('file', file);

    const response = await POST(makeRequest(formData));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Uploaded file must be an .epub file' });
    expect(mockParseEpub).not.toHaveBeenCalled();
    expect(mockAddBook).not.toHaveBeenCalled();
  });

  test('an empty title in the text-paste path returns 400 instead of creating an empty book', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const formData = new FormData();
    formData.set('title', '');
    formData.set('format', 'text');
    formData.set('rawText', 'some plain text content');

    const response = await POST(makeRequest(formData));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'title and rawText are required' });
    expect(mockAddBook).not.toHaveBeenCalled();
  });

  test('an empty rawText in the text-paste path returns 400 instead of creating an empty book', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const formData = new FormData();
    formData.set('title', 'My Book');
    formData.set('format', 'text');
    formData.set('rawText', '   ');

    const response = await POST(makeRequest(formData));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'title and rawText are required' });
    expect(mockAddBook).not.toHaveBeenCalled();
  });

  test('returns 401 when there is no authenticated user', async () => {
    mockGetAuthedUser.mockResolvedValue(null);

    const formData = new FormData();
    formData.set('title', 'My Book');
    formData.set('format', 'text');
    formData.set('rawText', 'some text');

    const response = await POST(makeRequest(formData));

    expect(response.status).toBe(401);
    expect(mockAddBook).not.toHaveBeenCalled();
  });
});
