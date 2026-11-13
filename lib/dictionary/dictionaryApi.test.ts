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
    expect(fetch).toHaveBeenCalledWith(
      'https://api.dictionaryapi.dev/api/v2/entries/en/ephemeral',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  test('returns null on a 404 (word not found)', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(fetchDefinition('zzznotaword')).resolves.toBeNull();
  });

  test('returns null on a network error rather than throwing', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down'));
    await expect(fetchDefinition('ephemeral')).resolves.toBeNull();
  });

  test('I6: passes an abort signal with a 5s timeout, and a timed-out request returns null instead of throwing', async () => {
    // Simulate the timeout having already fired instead of waiting out a
    // real 5-second deadline: AbortSignal.timeout is mocked to hand back an
    // already-aborted signal, and the fetch mock rejects the way a real
    // fetch does when its signal aborts.
    const controller = new AbortController();
    controller.abort();
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);

    global.fetch = vi.fn().mockRejectedValue(new DOMException('The operation was aborted.', 'TimeoutError'));

    await expect(fetchDefinition('ephemeral')).resolves.toBeNull();
    expect(timeoutSpy).toHaveBeenCalledWith(5000);
    expect(fetch).toHaveBeenCalledWith(
      'https://api.dictionaryapi.dev/api/v2/entries/en/ephemeral',
      { signal: controller.signal }
    );

    timeoutSpy.mockRestore();
  });

  test('returns null on a malformed (non-JSON-shaped) response instead of throwing', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new SyntaxError('Unexpected token in JSON');
      },
    });
    await expect(fetchDefinition('ephemeral')).resolves.toBeNull();
  });
});
