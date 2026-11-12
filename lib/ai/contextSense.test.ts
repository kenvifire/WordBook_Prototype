import { test, expect, vi } from 'vitest';
import { getContextSense } from './contextSense';
import type { AIClient } from './client';

test('parses a valid AI response into a WordSense', async () => {
  const client: AIClient = { complete: vi.fn().mockResolvedValue(JSON.stringify({
    definitionEn: 'a small donkey', translationEn: 'donkey', exampleEs: 'El burro es pequeño.',
  })) };
  const result = await getContextSense(client, { token: 'burro', sentence: 'El burro camina.' });
  expect(result).toEqual({ token: 'burro', sentence: 'El burro camina.', definitionEn: 'a small donkey', translationEn: 'donkey', exampleEs: 'El burro es pequeño.' });
});

test('falls back to a placeholder sense when the AI client throws', async () => {
  const client: AIClient = { complete: vi.fn().mockRejectedValue(new Error('down')) };
  const result = await getContextSense(client, { token: 'burro', sentence: 'El burro camina.' });
  expect(result.definitionEn).toBe('(definition unavailable)');
  expect(result.translationEn).toBe('burro');
});

test('falls back when the AI response is missing a required field', async () => {
  const client: AIClient = { complete: vi.fn().mockResolvedValue(JSON.stringify({ definitionEn: 'x' })) };
  const result = await getContextSense(client, { token: 'burro', sentence: 'El burro camina.' });
  expect(result.definitionEn).toBe('(definition unavailable)');
});
