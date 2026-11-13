import commonWordsList from './commonWords.json';
import { normalizeQuotes, normalizeToken } from './normalizeWord';

const COMMON_WORDS = new Set<string>(commonWordsList);

export function extractVocabulary(sectionText: string): string[] {
  const tokens = normalizeQuotes(sectionText).match(/[a-zA-Z']+/g) ?? [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tokens) {
    const word = normalizeToken(raw);
    if (!word) continue;
    if (seen.has(word)) continue;
    seen.add(word);
    if (COMMON_WORDS.has(word)) continue;
    result.push(word);
  }
  return result;
}
