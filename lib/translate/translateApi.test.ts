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

  test('short-circuits to null when sourceLanguage is not in the lookup table (e.g. "unknown")', async () => {
    global.fetch = vi.fn();
    await expect(translateWord('chat', 'unknown', 'english')).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  test('short-circuits to null when targetLanguage is not in the lookup table (free-text nativeLanguage)', async () => {
    global.fetch = vi.fn();
    await expect(translateWord('cat', 'english', 'Tagalog')).resolves.toBeNull();
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

  test('Fix 1: returns null when responseStatus is 403 (quota/bad-pair) even though HTTP status is 200', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        responseData: {
          translatedText:
            'MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY',
        },
        responseStatus: 403,
      }),
    });
    await expect(translateWord('chat', 'french', 'english')).resolves.toBeNull();
  });

  test('Fix 1: returns null when responseStatus is 429 (quota exhausted)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        responseData: { translatedText: 'MYMEMORY WARNING: QUOTA EXCEEDED' },
        responseStatus: 429,
      }),
    });
    await expect(translateWord('chat', 'french', 'english')).resolves.toBeNull();
  });

  test('Fix 1: returns null when responseStatus is 200 but translatedText still contains a MYMEMORY WARNING', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        responseData: {
          translatedText: 'mymemory warning: you used all available free translations for today',
        },
        responseStatus: 200,
      }),
    });
    await expect(translateWord('chat', 'french', 'english')).resolves.toBeNull();
  });

  test('Fix 1: returns null when translatedText is just the input word echoed back unchanged', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        responseData: { translatedText: '  Chat  ' },
        responseStatus: 200,
      }),
    });
    await expect(translateWord('chat', 'french', 'english')).resolves.toBeNull();
  });

  test('Fix 1: a real, differing translation with responseStatus 200 still resolves (happy path unaffected)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        responseData: { translatedText: 'cat', match: 1 },
        quotaFinished: false,
        responseStatus: 200,
      }),
    });
    await expect(translateWord('chat', 'french', 'english')).resolves.toBe('cat');
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

  test('Fix 3: short-circuits to null when sourceLanguage/targetLanguage are the same language in different case', async () => {
    global.fetch = vi.fn();
    await expect(translateWord('cat', 'english', 'ENGLISH')).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  test('Fix 3: a mixed-case targetLanguage still resolves via the table lookup (case/whitespace-insensitive)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        responseData: { translatedText: 'gato' },
        responseStatus: 200,
      }),
    });
    await expect(translateWord('chat', 'french', ' Spanish ')).resolves.toBe('gato');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.mymemory.translated.net/get?q=chat&langpair=fr|es',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
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
