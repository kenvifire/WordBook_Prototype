import type { AIClient } from './client';
import type { WordSense } from '../types';

interface RawContextSense {
  definitionEn: unknown;
  translationEn: unknown;
  exampleEs: unknown;
}

function buildPrompt(word: { token: string; sentence: string }): string {
  return [
    'You are helping a language learner understand a word as it is used in a specific sentence.',
    `Given the word "${word.token}" as it appears in the sentence: "${word.sentence}",`,
    'determine the sense the word has in THIS sentence, not its most common dictionary sense.',
    '',
    'Respond with ONLY a JSON object (no prose, no markdown fences) shaped like:',
    '{ "definitionEn": string, "translationEn": string, "exampleEs": string }',
    'where definitionEn is a short English definition of the word as used here,',
    'translationEn is the best single English translation for this sense,',
    'and exampleEs is a new, short Spanish example sentence using the word in this same sense.',
  ].join('\n');
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function parseResponse(response: string): RawContextSense | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(response);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const v = parsed as Record<string, unknown>;
  if (!('definitionEn' in v) || !('translationEn' in v) || !('exampleEs' in v)) return null;
  return { definitionEn: v.definitionEn, translationEn: v.translationEn, exampleEs: v.exampleEs };
}

function fallback(word: { token: string; sentence: string }): WordSense {
  return {
    token: word.token,
    sentence: word.sentence,
    definitionEn: '(definition unavailable)',
    translationEn: word.token,
    exampleEs: word.sentence,
  };
}

export async function getContextSense(
  client: AIClient,
  word: { token: string; sentence: string },
): Promise<WordSense> {
  let response: string;
  try {
    response = await client.complete(buildPrompt(word));
  } catch {
    return fallback(word);
  }

  const parsed = parseResponse(response);
  if (parsed === null) {
    return fallback(word);
  }

  if (
    !isNonEmptyString(parsed.definitionEn) ||
    !isNonEmptyString(parsed.translationEn) ||
    !isNonEmptyString(parsed.exampleEs)
  ) {
    return fallback(word);
  }

  return {
    token: word.token,
    sentence: word.sentence,
    definitionEn: parsed.definitionEn,
    translationEn: parsed.translationEn,
    exampleEs: parsed.exampleEs,
  };
}
