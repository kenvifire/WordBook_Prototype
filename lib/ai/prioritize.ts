import type { AIClient } from './client';
import type { CandidateWord, PrioritizedWord } from '../types';

export const DECK_SIZE_LIMIT = 12;

const FALLBACK_REASON = 'frequency fallback (AI unavailable)';

interface RawPrioritizedEntry {
  token: unknown;
  reason: unknown;
  priorityScore: unknown;
}

function buildPrompt(candidates: CandidateWord[], knownWords: string[]): string {
  return [
    'You are helping a language learner build a vocabulary deck from a reading section.',
    'Given the candidate words below (with an example sentence and how many times each occurs in the section),',
    'drop any candidate that is already in the learner\'s known-words list, then rank the remaining candidates',
    'by how worth teaching they are, considering frequency, difficulty, and narrative importance.',
    '',
    `Known words: ${JSON.stringify(knownWords)}`,
    `Candidates: ${JSON.stringify(candidates)}`,
    '',
    'Respond with ONLY a JSON array (no prose, no markdown fences) of objects shaped like:',
    '{ "token": string, "reason": string, "priorityScore": number }',
    'sorted descending by priorityScore.',
  ].join('\n');
}

function frequencyFallback(candidates: CandidateWord[], knownWords: string[], limit: number): PrioritizedWord[] {
  const known = new Set(knownWords);
  return candidates
    .filter((c) => !known.has(c.token))
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, limit)
    .map((c) => ({ ...c, reason: FALLBACK_REASON, priorityScore: c.occurrences }));
}

function isRawEntry(value: unknown): value is RawPrioritizedEntry {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return 'token' in v && 'reason' in v && 'priorityScore' in v;
}

function parseResponse(response: string): RawPrioritizedEntry[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(response);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;
  if (!parsed.every(isRawEntry)) return null;
  return parsed as RawPrioritizedEntry[];
}

export async function prioritizeWords(
  client: AIClient,
  candidates: CandidateWord[],
  knownWords: string[],
  opts?: { limit?: number },
): Promise<PrioritizedWord[]> {
  const limit = opts?.limit ?? DECK_SIZE_LIMIT;

  let response: string;
  try {
    response = await client.complete(buildPrompt(candidates, knownWords));
  } catch {
    return frequencyFallback(candidates, knownWords, limit);
  }

  const parsed = parseResponse(response);
  if (parsed === null) {
    return frequencyFallback(candidates, knownWords, limit);
  }

  const byToken = new Map(candidates.map((c) => [c.token, c]));

  const merged: PrioritizedWord[] = [];
  for (const entry of parsed) {
    if (
      typeof entry.token !== 'string' ||
      typeof entry.reason !== 'string' ||
      typeof entry.priorityScore !== 'number'
    ) {
      continue;
    }
    const candidate = byToken.get(entry.token);
    if (!candidate) continue;
    merged.push({
      token: candidate.token,
      sentence: candidate.sentence,
      occurrences: candidate.occurrences,
      reason: entry.reason,
      priorityScore: entry.priorityScore,
    });
  }

  return merged.sort((a, b) => b.priorityScore - a.priorityScore).slice(0, limit);
}
