import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateStory } from './deepseek';

const FAKE_API_KEY = 'test-api-key';

beforeEach(() => {
  vi.stubEnv('DEEPSEEK_API_KEY', FAKE_API_KEY);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function mockChatCompletion(content: string, overrides: Partial<Response> = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content } }],
    }),
    ...overrides,
  } as Response;
}

describe('generateStory', () => {
  test('sends topic/difficulty/language/targetWordCount in the prompt and parses title/text/vocabulary from the response', async () => {
    const fixture = {
      title: 'The Lost Lantern',
      text: 'Once upon a time... '.repeat(40),
      vocabulary: ['lantern', 'wander', 'dusk'],
    };
    const fetchMock = vi.fn().mockResolvedValue(mockChatCompletion(JSON.stringify(fixture)));
    global.fetch = fetchMock;

    const result = await generateStory({
      topic: 'a midnight walk',
      difficulty: 'intermediate',
      language: 'english',
      targetWordCount: 20,
    });

    expect(result).toEqual(fixture);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, requestInit] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.deepseek.com/chat/completions');
    expect(requestInit.method).toBe('POST');
    expect(requestInit.headers).toEqual(
      expect.objectContaining({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${FAKE_API_KEY}`,
      })
    );

    const body = JSON.parse(requestInit.body as string);
    expect(body.model).toBe('deepseek-chat');
    expect(Array.isArray(body.messages)).toBe(true);
    const promptText = body.messages.map((m: { content: string }) => m.content).join(' ');
    expect(promptText).toContain('a midnight walk');
    expect(promptText).toContain('intermediate');
    expect(promptText).toContain('english');
    expect(promptText).toContain('20');
  });

  test('parses a JSON response wrapped in a markdown code fence', async () => {
    const fixture = { title: 'Fenced Tale', text: 'word '.repeat(30), vocabulary: ['word'] };
    const fenced = '```json\n' + JSON.stringify(fixture) + '\n```';
    global.fetch = vi.fn().mockResolvedValue(mockChatCompletion(fenced));

    const result = await generateStory({
      topic: 'fences',
      difficulty: 'beginner',
      language: 'english',
      targetWordCount: 10,
    });

    expect(result).toEqual(fixture);
  });

  test('throws a clear error when the response is missing a required field', async () => {
    const incomplete = { title: 'Missing Vocab', text: 'some story text' }; // no vocabulary field
    global.fetch = vi.fn().mockResolvedValue(mockChatCompletion(JSON.stringify(incomplete)));

    await expect(
      generateStory({ topic: 'x', difficulty: 'beginner', language: 'english', targetWordCount: 10 })
    ).rejects.toThrow();
  });

  test('throws a clear error when the response content is not valid JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockChatCompletion('not json at all'));

    await expect(
      generateStory({ topic: 'x', difficulty: 'beginner', language: 'english', targetWordCount: 10 })
    ).rejects.toThrow();
  });

  test('throws a clear error on an HTTP failure (does not silently return a partial result)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    await expect(
      generateStory({ topic: 'x', difficulty: 'beginner', language: 'english', targetWordCount: 10 })
    ).rejects.toThrow();
  });

  test('throws a clear error on a network failure/timeout (does not silently return a partial result)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new DOMException('The operation was aborted.', 'TimeoutError'));

    await expect(
      generateStory({ topic: 'x', difficulty: 'beginner', language: 'english', targetWordCount: 10 })
    ).rejects.toThrow();
  });

  test('throws a clear error when DEEPSEEK_API_KEY is not configured', async () => {
    vi.unstubAllEnvs();
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    await expect(
      generateStory({ topic: 'x', difficulty: 'beginner', language: 'english', targetWordCount: 10 })
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
