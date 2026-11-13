import commonWordsList from './commonWords.json';

const COMMON_WORDS = new Set<string>(commonWordsList);

export function extractVocabulary(sectionText: string): string[] {
  const tokens = sectionText.match(/[a-zA-Z']+/g) ?? [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tokens) {
    const word = raw.toLowerCase();
    if (seen.has(word)) continue;
    seen.add(word);
    if (COMMON_WORDS.has(word)) continue;
    result.push(word);
  }
  return result;
}
