import { describe, expect, test } from 'vitest';
import { detectLanguage } from './detectLanguage';

describe('detectLanguage', () => {
  test('detects English', () => {
    expect(
      detectLanguage(
        'The committee will review the proposal next week, and every member is expected to read the full report carefully before the meeting so that the discussion can be productive.',
      ),
    ).toBe('english');
  });

  test('detects Spanish', () => {
    expect(
      detectLanguage(
        'El viejo faro se alzaba sobre el acantilado rocoso durante más de cien años, guiando a los barcos pesqueros de vuelta al puerto a salvo de todas las tormentas que llegaban desde el mar gris del Atlántico.',
      ),
    ).toBe('spanish');
  });

  test('returns unknown for text too short/ambiguous to classify confidently', () => {
    expect(detectLanguage('ok')).toBe('unknown');
  });
});
