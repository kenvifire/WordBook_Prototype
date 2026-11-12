import { describe, test, expect } from 'vitest';
import { splitSentences, tokenizeWords, normalizeToken } from './tokenize';

test('splitSentences handles Spanish punctuation and dialogue dashes', () => {
  const text = '¡Platero es pequeño! —dijo el niño. ¿Verdad que sí?';
  expect(splitSentences(text)).toEqual([
    '¡Platero es pequeño!',
    '—dijo el niño.',
    '¿Verdad que sí?',
  ]);
});

test('tokenizeWords strips punctuation but keeps accents and drops a leading dash', () => {
  expect(tokenizeWords('¡Platero es pequeño, peludo y algodonoso!')).toEqual([
    'Platero', 'es', 'pequeño', 'peludo', 'y', 'algodonoso',
  ]);
  expect(tokenizeWords('—dijo años.')).toEqual(['dijo', 'años']);
});

test('normalizeToken lowercases while preserving accented letters', () => {
  expect(normalizeToken('Platero')).toBe('platero');
  expect(normalizeToken('AÑOS')).toBe('años');
});
