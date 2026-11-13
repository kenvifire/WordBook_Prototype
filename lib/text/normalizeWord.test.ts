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
});
