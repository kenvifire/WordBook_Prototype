import { describe, expect, test } from 'vitest';
import { buildWordId } from './wordId';

describe('buildWordId', () => {
  test('buildWordId joins userId, language, and word with underscores', () => {
    expect(buildWordId('u1', 'english', 'book')).toBe('u1_english_book');
  });

  test('buildWordId keeps the same word in different languages distinct', () => {
    expect(buildWordId('u1', 'english', 'chat')).not.toBe(buildWordId('u1', 'french', 'chat'));
  });
});
