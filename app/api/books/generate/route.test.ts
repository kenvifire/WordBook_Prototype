// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/firebase/server', () => ({
  getAuthedUser: vi.fn(),
}));

vi.mock('@/lib/books/generateBook', () => ({
  startGeneratingBook: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { getAuthedUser } from '@/lib/firebase/server';
import { startGeneratingBook } from '@/lib/books/generateBook';
import { POST } from './route';

const mockGetAuthedUser = getAuthedUser as unknown as ReturnType<typeof vi.fn>;
const mockStartGeneratingBook = startGeneratingBook as unknown as ReturnType<typeof vi.fn>;

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/books/generate', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    topic: 'a brave knight',
    difficulty: 'beginner',
    language: 'es',
    targetWordCount: 20,
    ...overrides,
  };
}

beforeEach(() => {
  mockGetAuthedUser.mockReset();
  mockStartGeneratingBook.mockReset();
});

describe('POST /api/books/generate', () => {
  test('rejects a targetWordCount outside 5-50', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const tooLow = await POST(makeRequest(validBody({ targetWordCount: 4 })));
    expect(tooLow.status).toBe(400);
    expect(mockStartGeneratingBook).not.toHaveBeenCalled();

    const tooHigh = await POST(makeRequest(validBody({ targetWordCount: 51 })));
    expect(tooHigh.status).toBe(400);
    expect(mockStartGeneratingBook).not.toHaveBeenCalled();
  });

  test('rejects an empty topic or an invalid difficulty literal', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const emptyTopic = await POST(makeRequest(validBody({ topic: '' })));
    expect(emptyTopic.status).toBe(400);
    expect(mockStartGeneratingBook).not.toHaveBeenCalled();

    const invalidDifficulty = await POST(makeRequest(validBody({ difficulty: 'expert' })));
    expect(invalidDifficulty.status).toBe(400);
    expect(mockStartGeneratingBook).not.toHaveBeenCalled();
  });

  test('requires auth (401 without a session)', async () => {
    mockGetAuthedUser.mockResolvedValue(null);

    const response = await POST(makeRequest(validBody()));

    expect(response.status).toBe(401);
    expect(mockStartGeneratingBook).not.toHaveBeenCalled();
  });

  test('on valid input, calls startGeneratingBook and returns 201 with the bookId', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    mockStartGeneratingBook.mockResolvedValue({ bookId: 'book-123' });

    const body = validBody();
    const response = await POST(makeRequest(body));
    const responseBody = await response.json();

    expect(response.status).toBe(201);
    expect(responseBody).toEqual({ bookId: 'book-123' });
    expect(mockStartGeneratingBook).toHaveBeenCalledWith({
      topic: body.topic,
      difficulty: body.difficulty,
      language: body.language,
      targetWordCount: body.targetWordCount,
      userId: 'user-1',
    });
  });
});
