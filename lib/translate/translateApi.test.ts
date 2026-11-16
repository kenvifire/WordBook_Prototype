import { describe, test, expect, vi, afterEach } from 'vitest';
import { translateWord } from './translateApi';

afterEach(() => vi.restoreAllMocks());

describe('translateWord', () => {
  test('returns the MyMemory translation for a word pair', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        responseData: { translatedText: 'cat', match: 1 },
        quotaFinished: false,
        responseStatus: 200,
      }),
    });
    await expect(translateWord('chat', 'french', 'english')).resolves.toBe('cat');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.mymemory.translated.net/get?q=chat&langpair=fr|en',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  test('returns null (no translation) when targetLanguage is null', async () => {
    global.fetch = vi.fn();
    await expect(translateWord('chat', 'french', null)).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  test('short-circuits to null (no translation needed) when source and target languages are the same', async () => {
    global.fetch = vi.fn();
    await expect(translateWord('cat', 'english', 'english')).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  test('returns null on a network failure or timeout, never throws', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));
    await expect(translateWord('chat', 'french', 'english')).resolves.toBeNull();
  });

  test('returns null on a non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(translateWord('chat', 'french', 'english')).resolves.toBeNull();
  });

  test('returns null on a malformed (non-JSON-shaped) response instead of throwing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token in JSON');
      },
    });
    await expect(translateWord('chat', 'french', 'english')).resolves.toBeNull();
  });

  test('passes a 5s timeout signal, and a timed-out request returns null instead of throwing', async () => {
    const controller = new AbortController();
    controller.abort();
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);

    global.fetch = vi.fn().mockRejectedValue(new DOMException('The operation was aborted.', 'TimeoutError'));

    await expect(translateWord('chat', 'french', 'english')).resolves.toBeNull();
    expect(timeoutSpy).toHaveBeenCalledWith(5000);

    timeoutSpy.mockRestore();
  });
});
