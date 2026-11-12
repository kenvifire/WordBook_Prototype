import { test, expect, vi } from 'vitest';
import { prioritizeWords, DECK_SIZE_LIMIT } from './prioritize';
import type { AIClient } from './client';

const fakeClient = (response: string): AIClient => ({ complete: vi.fn().mockResolvedValue(response) });

test('ranks and merges the AI response back onto the original candidates', async () => {
  const candidates = [
    { token: 'burro', sentence: 'El burro camina.', occurrences: 3 },
    { token: 'algodonoso', sentence: 'Es algodonoso.', occurrences: 1 },
  ];
  const client = fakeClient(JSON.stringify([
    { token: 'algodonoso', reason: 'rare, descriptive', priorityScore: 0.9 },
    { token: 'burro', reason: 'frequent, central to the story', priorityScore: 0.7 },
  ]));
  const result = await prioritizeWords(client, candidates, []);
  expect(result).toEqual([
    { token: 'algodonoso', sentence: 'Es algodonoso.', occurrences: 1, reason: 'rare, descriptive', priorityScore: 0.9 },
    { token: 'burro', sentence: 'El burro camina.', occurrences: 3, reason: 'frequent, central to the story', priorityScore: 0.7 },
  ]);
});

test('falls back to frequency ranking when the AI client throws', async () => {
  const candidates = [{ token: 'a', sentence: 's1', occurrences: 1 }, { token: 'b', sentence: 's2', occurrences: 5 }];
  const client: AIClient = { complete: vi.fn().mockRejectedValue(new Error('down')) };
  const result = await prioritizeWords(client, candidates, []);
  expect(result.map(r => r.token)).toEqual(['b', 'a']);
  expect(result[0].reason).toBe('frequency fallback (AI unavailable)');
});

test('falls back when the AI response is not valid JSON', async () => {
  const result = await prioritizeWords(fakeClient('not json'), [{ token: 'a', sentence: 's', occurrences: 2 }], []);
  expect(result[0].reason).toBe('frequency fallback (AI unavailable)');
});

test('respects the limit and defaults to DECK_SIZE_LIMIT', async () => {
  const many = Array.from({ length: 20 }, (_, i) => ({ token: `w${i}`, sentence: 's', occurrences: 20 - i }));
  const client: AIClient = { complete: vi.fn().mockRejectedValue(new Error('down')) }; // fallback path keeps this deterministic
  expect(await prioritizeWords(client, many, [])).toHaveLength(DECK_SIZE_LIMIT);
});

test('a section where every candidate is already known returns an empty deck, not an error', async () => {
  const client: AIClient = { complete: vi.fn().mockRejectedValue(new Error('down')) };
  const result = await prioritizeWords(client, [{ token: 'burro', sentence: 's', occurrences: 2 }], ['burro']);
  expect(result).toEqual([]);
});

test('drops an already-known token even if the AI response includes it (ignores the model obeying the prompt)', async () => {
  const candidates = [
    { token: 'burro', sentence: 'El burro camina.', occurrences: 3 },
    { token: 'algodonoso', sentence: 'Es algodonoso.', occurrences: 1 },
  ];
  const client = fakeClient(JSON.stringify([
    { token: 'burro', reason: 'should have been excluded', priorityScore: 0.95 },
    { token: 'algodonoso', reason: 'rare, descriptive', priorityScore: 0.9 },
  ]));
  const result = await prioritizeWords(client, candidates, ['burro']);
  expect(result).toEqual([
    { token: 'algodonoso', sentence: 'Es algodonoso.', occurrences: 1, reason: 'rare, descriptive', priorityScore: 0.9 },
  ]);
});
