import { describe, test, expect, vi, afterEach } from 'vitest';
import { fetchDefinition } from './dictionaryApi';

afterEach(() => vi.restoreAllMocks());

describe('fetchDefinition', () => {
  test('returns the first definition on a successful lookup', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ meanings: [{ definitions: [{ definition: 'a fleeting thing' }] }] }],
    });
    await expect(fetchDefinition('ephemeral')).resolves.toBe('a fleeting thing');
    expect(fetch).toHaveBeenCalledWith('https://api.dictionaryapi.dev/api/v2/entries/en/ephemeral');
  });

  test('returns null on a 404 (word not found)', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(fetchDefinition('zzznotaword')).resolves.toBeNull();
  });

  test('returns null on a network error rather than throwing', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));
    await expect(fetchDefinition('ephemeral')).resolves.toBeNull();
  });
});
