import { describe, test, expect } from 'vitest';
import { extractCandidates, SPANISH_STOPWORDS } from './filter';

test('SPANISH_STOPWORDS contains common function words', () => {
  for (const w of ['el', 'la', 'los', 'las', 'de', 'que', 'y', 'en', 'un', 'una', 'es', 'por', 'con', 'su', 'se', 'no', 'lo', 'le', 'del']) {
    expect(SPANISH_STOPWORDS.has(w)).toBe(true);
  }
});

test('extractCandidates filters stopwords and proper nouns, keeps common words, counts occurrences', () => {
  const text = 'Platero es pequeño. El burro llamado Platero camina. Marcos vio a Platero.';
  const byToken = Object.fromEntries(extractCandidates(text).map(c => [c.token, c]));
  expect(byToken['platero']).toBeUndefined(); // capitalized mid-sentence elsewhere -> proper noun
  expect(byToken['marcos']).toBeUndefined(); // proper noun
  expect(byToken['el']).toBeUndefined(); // stopword even though sentence-initial
  expect(byToken['pequeño']).toEqual({ token: 'pequeño', sentence: 'Platero es pequeño.', occurrences: 1 });
  expect(byToken['burro']).toEqual({ token: 'burro', sentence: 'El burro llamado Platero camina.', occurrences: 1 });
});

test('extractCandidates returns an empty array for text with nothing left after filtering', () => {
  expect(extractCandidates('El la de que y en un.')).toEqual([]);
});
