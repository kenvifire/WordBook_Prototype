// DeepSeek's chat-completions endpoint — OpenAI-chat-completions-compatible
// (POST with {model, messages: [{role, content}]}, response shape
// {choices: [{message: {content}}]}). Assumed from DeepSeek's documented API
// shape; never called for real in this repo's tests (DEEPSEEK_API_KEY is a
// paid key — every test here mocks `fetch`).
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const MODEL = 'deepseek-chat';

// Story generation is a slower, heavier call than a dictionary/translation
// lookup, so this timeout is generous compared to those (5s). Still bounded
// so a stalled request fails loudly (this function throws, unlike
// fetchDefinition/translateWord) instead of hanging the caller forever.
const TIMEOUT_MS = 60_000;

export type GenerateStoryInput = {
  topic: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  targetWordCount: number; // 5–50, validated by the caller (Task 4)
};

export type GenerateStoryResult = { title: string; text: string; vocabulary: string[] };

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

// Models sometimes wrap JSON replies in a markdown code fence (```json ... ```)
// despite being told not to — a real gotcha seen with other providers in this
// app's history. Strip a single surrounding fence, if present, before
// JSON.parse. Unfenced input is returned trimmed.
function stripCodeFence(response: string): string {
  const trimmed = response.trim();
  const match = trimmed.match(/^```[a-zA-Z]*\s*([\s\S]*?)\s*```$/);
  return match ? match[1] : trimmed;
}

function buildPrompt(input: GenerateStoryInput): { system: string; user: string } {
  const { topic, difficulty, language, targetWordCount } = input;

  const system =
    'You are a story writer for a language-learning app. Write engaging, level-appropriate short ' +
    'stories in the requested language, weaving in vocabulary naturally rather than listing it. ' +
    'Respond with ONLY a single JSON object — no markdown formatting, no commentary before or after — ' +
    'with exactly these fields: "title" (a short string), "text" (the full story, as plain prose in ' +
    'the requested language), and "vocabulary" (an array of strings: exactly the notable, non-common ' +
    "words you wove into the story, spelled as they appear in the story's own language).";

  const user =
    `Write a ${difficulty}-level story in ${language} about: ${topic}. ` +
    `Weave in approximately ${targetWordCount} notable vocabulary words appropriate for a ${difficulty} ` +
    `learner of ${language}, surrounded by enough connective prose that the story is long enough to be ` +
    `split into several 150-word reading sections (so, well more than ${targetWordCount} words in total). ` +
    'Return JSON only, matching exactly: {"title": "...", "text": "...", "vocabulary": ["...", "..."]}.';

  return { system, user };
}

/**
 * Generate a story via DeepSeek's chat-completions API. Unlike
 * fetchDefinition/translateWord, this throws on any failure (missing API
 * key, HTTP failure, timeout, malformed/incomplete JSON) — the caller
 * (Task 4's generateBook) catches it and flips generationStatus to 'failed'.
 */
export async function generateStory(input: GenerateStoryInput): Promise<GenerateStoryResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  const { system, user } = buildPrompt(input);

  let res: Response;
  try {
    res = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
      }),
      // Unlike fetchDefinition/translateWord's caught-and-null AbortSignal.timeout
      // usage, a timeout here rejects fetch with an AbortError, which is caught
      // below and re-thrown as a clear Error — this function is meant to throw.
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw new Error(
      `DeepSeek story generation request failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (!res.ok) {
    throw new Error(`DeepSeek story generation failed with HTTP status ${res.status}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('DeepSeek response is missing message content');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(content));
  } catch {
    throw new Error('DeepSeek response content was not valid JSON');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('DeepSeek response JSON was not an object');
  }

  const { title, text, vocabulary } = parsed as Record<string, unknown>;
  if (typeof title !== 'string' || typeof text !== 'string' || !isStringArray(vocabulary)) {
    throw new Error('DeepSeek response is missing required fields (title/text/vocabulary)');
  }

  return { title, text, vocabulary };
}
