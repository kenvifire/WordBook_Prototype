import { test, expect, vi } from 'vitest';
import { translateWord } from './mymemory';

test('translateWord parses the MyMemory response and defaults to es->en', async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ responseData: { translatedText: 'donkey' } }) });
  await expect(translateWord('burro')).resolves.toEqual({ translatedText: 'donkey' });
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('langpair=es%7Cen'));
});

test('translateWord echoes the original word when the request fails', async () => {
  global.fetch = vi.fn().mockRejectedValue(new Error('network down'));
  await expect(translateWord('burro')).resolves.toEqual({ translatedText: 'burro' });
});

test('translateWord echoes the original word on a malformed response body', async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  await expect(translateWord('burro')).resolves.toEqual({ translatedText: 'burro' });
});
