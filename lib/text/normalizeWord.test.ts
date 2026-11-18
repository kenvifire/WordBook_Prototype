import { describe, test, expect } from 'vitest';
import { normalizeWord } from './normalizeWord';

describe('normalizeWord', () => {
  test('lowercases and strips surrounding punctuation', () => {
    expect(normalizeWord('Hello,')).toBe('hello');
  });

  test('strips a trailing possessive/contraction clitic', () => {
    expect(normalizeWord("John's")).toBe('john');
    expect(normalizeWord("isn't")).toBe('is');
    expect(normalizeWord("he'll")).toBe('he');
  });

  test('normalizes curly quotes the same way as straight ones', () => {
    expect(normalizeWord('it’s')).toBe('it');
  });

  test('returns an empty string for a token with no letters', () => {
    expect(normalizeWord("'")).toBe('');
    expect(normalizeWord('123')).toBe('');
  });

  test('keeps accented letters', () => {
    expect(normalizeWord('café')).toBe('café');
    expect(normalizeWord('¡mañana!')).toBe('mañana');
  });

  test('normalizes composed and decomposed Unicode accents to the identical string', () => {
    const composed = 'café'; // U+00E9, a single composed codepoint
    const decomposed = 'café'; // 'e' + U+0301 combining acute accent
    expect(composed).not.toBe(decomposed); // sanity check: genuinely different input strings
    expect(normalizeWord(composed)).toBe(normalizeWord(decomposed));
    expect(normalizeWord(decomposed)).toBe('café');
  });
});
