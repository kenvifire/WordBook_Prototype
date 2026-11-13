// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/epub/parseEpub', () => ({
  parseEpub: vi.fn(),
}));

vi.mock('@/lib/books/bookService', () => ({
  addBook: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseEpub } from '@/lib/epub/parseEpub';
import { addBook } from '@/lib/books/bookService';
import { POST } from './route';

const mockCreateClient = createClient as unknown as ReturnType<typeof vi.fn>;
const mockParseEpub = parseEpub as unknown as ReturnType<typeof vi.fn>;
const mockAddBook = addBook as unknown as ReturnType<typeof vi.fn>;

function makeSupabaseMock(user: { id: string } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ data: { path: 'uploaded' }, error: null }),
      })),
    },
  };
}

function makeRequest(formData: FormData) {
  return new NextRequest('http://localhost/api/books', {
    method: 'POST',
    body: formData,
  });
}

beforeEach(() => {
  mockCreateClient.mockReset();
  mockParseEpub.mockReset();
  mockAddBook.mockReset();
});

describe('POST /api/books', () => {
  test('with { title, format: "text", rawText } calls addBook and returns 201 with the new bookId', async () => {
    const supabase = makeSupabaseMock({ id: 'user-1' });
    mockCreateClient.mockResolvedValue(supabase);
    mockAddBook.mockResolvedValue({ bookId: 'book-123' });

    const formData = new FormData();
    formData.set('title', 'My Book');
    formData.set('format', 'text');
    formData.set('rawText', 'some plain text content');

    const response = await POST(makeRequest(formData));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({ bookId: 'book-123' });
    expect(mockAddBook).toHaveBeenCalledWith(supabase, {
      title: 'My Book',
      author: undefined,
      format: 'text',
      rawText: 'some plain text content',
      userId: 'user-1',
    });
    expect(mockParseEpub).not.toHaveBeenCalled();
  });

  test('with format: "epub" parses the uploaded file via parseEpub before calling addBook', async () => {
    const supabase = makeSupabaseMock({ id: 'user-1' });
    mockCreateClient.mockResolvedValue(supabase);
    mockParseEpub.mockResolvedValue({ title: 'EPUB Title', author: 'EPUB Author', text: 'flattened text' });
    mockAddBook.mockResolvedValue({ bookId: 'book-456' });

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
    expect(mockAddBook).toHaveBeenCalledWith(supabase, {
      title: 'EPUB Title',
      author: 'EPUB Author',
      format: 'epub',
      rawText: 'flattened text',
      userId: 'user-1',
    });
  });

  test('an unparseable EPUB upload returns 400, not 500', async () => {
    const supabase = makeSupabaseMock({ id: 'user-1' });
    mockCreateClient.mockResolvedValue(supabase);
    mockParseEpub.mockRejectedValue(new Error('Could not parse EPUB file'));

    const formData = new FormData();
    const file = new File(['not a real epub'], 'broken.epub', { type: 'application/epub+zip' });
    formData.set('file', file);

    const response = await POST(makeRequest(formData));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'Could not parse EPUB file' });
    expect(mockAddBook).not.toHaveBeenCalled();
  });

  test('returns 401 when there is no authenticated user', async () => {
    const supabase = makeSupabaseMock(null);
    mockCreateClient.mockResolvedValue(supabase);

    const formData = new FormData();
    formData.set('title', 'My Book');
    formData.set('format', 'text');
    formData.set('rawText', 'some text');

    const response = await POST(makeRequest(formData));

    expect(response.status).toBe(401);
    expect(mockAddBook).not.toHaveBeenCalled();
  });
});
