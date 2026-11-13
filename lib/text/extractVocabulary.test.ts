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

  test('I2: contractions, possessives, and stray quote marks are cleaned instead of becoming junk vocabulary', () => {
    const result = extractVocabulary(
      "'I don't know,' she said. 'It's the alchemist's book, isn't it? I'm sure he'll want it.'"
    );
    // None of the junk tokens the raw tokenizer used to produce should appear.
    for (const junk of [
      "'i",
      "'",
      "'it's",
      "don't",
      "isn't",
      "i'm",
      "he'll",
      "it's",
      "alchemist's",
    ]) {
      expect(result).not.toContain(junk);
    }
    // "alchemist" is the only genuinely non-common word in the sentence;
    // everything else (i, do, is, it, the, she, said, book, sure, want) is a
    // common word once its clitic/quote is stripped.
    expect(result).toEqual(['alchemist']);
  });

  test('I2: curly quotes (as EPUBs commonly use) are normalized the same way as straight ones', () => {
    const result = extractVocabulary(
      'It’s the alchemist’s book, isn’t it?'
    );
    expect(result).toEqual(['alchemist']);
  });
});
