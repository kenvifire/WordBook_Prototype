import { describe, test, expect, vi, afterEach } from 'vitest';
import { createOpenAIClient, AIClientError } from './client';

afterEach(() => {
  vi.restoreAllMocks();
});

test('complete posts to the chat completions endpoint and returns the message content', async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: 'hello' } }] }) });
  const client = createOpenAIClient('key', 'gpt-4o-mini');
  await expect(client.complete('prompt')).resolves.toBe('hello');
  expect(fetch).toHaveBeenCalledWith(
    'https://api.openai.com/v1/chat/completions',
    expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer key' }) }),
  );
});

test('complete throws AIClientError on a non-ok response', async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => 'rate limited' });
  await expect(createOpenAIClient('key').complete('prompt')).rejects.toThrow(AIClientError);
});
