import { describe, test, expect } from 'vitest';
import { extractVocabulary } from './extractVocabulary';

describe('extractVocabulary', () => {
  test('lowercases, strips punctuation, dedupes, and drops common words', () => {
    const result = extractVocabulary('The Ephemeral, the EPHEMERAL moonlit grove. The grove!');
    expect(result).toEqual(['ephemeral', 'moonlit', 'grove']);
  });

  test('a section with only common words yields an empty list', () => {
    expect(extractVocabulary('the a is and or')).toEqual([]);
  });
});
