import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/services/deckService', () => ({
  buildDeck: vi.fn(),
}));

import { GET } from './route';
import { buildDeck } from '@/lib/services/deckService';

beforeEach(() => {
  vi.clearAllMocks();
});

test('returns 200 with the deck on the happy path', async () => {
  const deck = { sectionId: 'platero-y-yo-0', words: [] };
  vi.mocked(buildDeck).mockResolvedValue(deck);

  const response = await GET(new Request('http://localhost/api/sections/platero-y-yo-0/deck'), {
    params: Promise.resolve({ sectionId: 'platero-y-yo-0' }),
  });

  expect(response.status).toBe(200);
  await expect(response.json()).resolves.toEqual(deck);
});

test('returns 404 when buildDeck throws for an unknown section', async () => {
  vi.mocked(buildDeck).mockRejectedValue(new Error('Unknown section'));

  const response = await GET(new Request('http://localhost/api/sections/nope/deck'), {
    params: Promise.resolve({ sectionId: 'nope' }),
  });

  expect(response.status).toBe(404);
  await expect(response.json()).resolves.toEqual({ error: 'not found' });
});
