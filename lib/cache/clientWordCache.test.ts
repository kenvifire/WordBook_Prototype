import { describe, expect, test } from 'vitest';
import { getCachedDefinition, setCachedDefinition } from './clientWordCache';

// Unique keys per test keep the module-level Map isolated between tests.
let n = 0;
const key = (base: string) => `${base}-${++n}`;

describe('clientWordCache', () => {
  test('round-trips a cached definition, distinguishing "not cached" from "cached as null"', () => {
    const k = key('english:chat');
    expect(getCachedDefinition(k)).toBeUndefined();
    setCachedDefinition(k, null);
    expect(getCachedDefinition(k)).toBeNull();
  });

  test('round-trips a cached non-null definition', () => {
    const k = key('english:lucid');
    expect(getCachedDefinition(k)).toBeUndefined();
    setCachedDefinition(k, 'clear and easy to understand');
    expect(getCachedDefinition(k)).toBe('clear and easy to understand');
  });

  test('the same word in two different languages does not collide', () => {
    const word = key('shared-word');
    const englishKey = `english:${word}`;
    const frenchKey = `french:${word}`;
    setCachedDefinition(englishKey, 'an english definition');
    setCachedDefinition(frenchKey, 'a french definition');
    expect(getCachedDefinition(englishKey)).toBe('an english definition');
    expect(getCachedDefinition(frenchKey)).toBe('a french definition');
  });
});
