import { splitSentences, tokenizeWords, normalizeToken } from './tokenize';
import { SPANISH_STOPWORDS } from './stopwords.es';
import type { CandidateWord } from '../types';

export { SPANISH_STOPWORDS };

function isCapitalized(token: string): boolean {
  const first = token.charAt(0);
  return first !== first.toLowerCase();
}

function isDigitsOnly(token: string): boolean {
  return /^\d+$/.test(token);
}

interface TokenInfo {
  occurrences: number;
  firstSentence: string;
  everCapitalized: boolean;
  everLowercase: boolean;
}

/**
 * Extracts the set of unique normalized words worth considering teaching
 * from a section of Spanish text, excluding stopwords and likely proper
 * nouns.
 *
 * Proper-noun rule: a normalized token is excluded if it is capitalized in
 * the source in EVERY occurrence across the whole text (i.e. it never
 * appears in lowercase form anywhere). A token that appears lowercase at
 * least once is never treated as a proper noun, regardless of how it's
 * cased elsewhere (including sentence-initial position).
 */
export function extractCandidates(
  text: string,
  opts?: { stopwords?: Set<string> }
): CandidateWord[] {
  const stopwords = opts?.stopwords ?? SPANISH_STOPWORDS;
  const sentences = splitSentences(text);

  const info = new Map<string, TokenInfo>();

  for (const sentence of sentences) {
    const words = tokenizeWords(sentence);
    for (const word of words) {
      const normalized = normalizeToken(word);
      const capitalized = isCapitalized(word);

      let entry = info.get(normalized);
      if (!entry) {
        entry = {
          occurrences: 0,
          firstSentence: sentence,
          everCapitalized: false,
          everLowercase: false,
        };
        info.set(normalized, entry);
      }
      entry.occurrences += 1;
      if (capitalized) {
        entry.everCapitalized = true;
      } else {
        entry.everLowercase = true;
      }
    }
  }

  const results: CandidateWord[] = [];
  for (const [token, entry] of info) {
    const isProperNoun = entry.everCapitalized && !entry.everLowercase;
    if (isProperNoun) continue;
    if (stopwords.has(token)) continue;
    if (token.length < 2) continue;
    if (isDigitsOnly(token)) continue;

    results.push({
      token,
      sentence: entry.firstSentence,
      occurrences: entry.occurrences,
    });
  }

  return results;
}
