import { describe, expect, test } from 'vitest';
import { detectLanguage } from './detectLanguage';

describe('detectLanguage', () => {
  test('detects English', () => {
    expect(detectLanguage('The quick brown fox jumps over the lazy dog.')).toBe('english');
  });

  test('detects Spanish', () => {
    expect(detectLanguage('El rápido zorro marrón salta sobre el perro perezoso.')).toBe('spanish');
  });

  test('returns unknown for text too short/ambiguous to classify confidently', () => {
    expect(detectLanguage('ok')).toBe('unknown');
  });
});
