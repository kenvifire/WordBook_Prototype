import { describe, test, expect } from 'vitest';
import { isAlreadyExistsError } from './errors';

describe('isAlreadyExistsError', () => {
  test('returns true for a Firestore-shaped error with code 6', () => {
    const err: Error & { code?: number } = new Error(
      '6 ALREADY_EXISTS: Document already exists'
    );
    err.code = 6;

    expect(isAlreadyExistsError(err)).toBe(true);
  });

  test('returns false for an error with a different code', () => {
    const err: Error & { code?: number } = new Error('5 NOT_FOUND');
    err.code = 5;

    expect(isAlreadyExistsError(err)).toBe(false);
  });

  test('returns false for a non-error value and does not throw', () => {
    expect(isAlreadyExistsError(undefined)).toBe(false);
    expect(() => isAlreadyExistsError(undefined)).not.toThrow();
  });
});
