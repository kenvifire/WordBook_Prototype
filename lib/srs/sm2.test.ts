import { describe, test, expect } from 'vitest';
import { applyRating } from './sm2';

const base = { repetitions: 2, easeFactor: 2.0, intervalDays: 10 };
const today = new Date('2026-11-13');

describe('applyRating', () => {
  test('again resets repetitions/interval and lowers ease, floored at 1.3', () => {
    expect(applyRating(base, 'again', today)).toMatchObject({
      repetitions: 0,
      intervalDays: 1,
      easeFactor: 1.8,
    });
    expect(applyRating({ ...base, easeFactor: 1.35 }, 'again', today).easeFactor).toBe(1.3);
  });

  test('hard grows interval by 1.2x and lowers ease by 0.15, floored at 1.3', () => {
    expect(applyRating(base, 'hard', today)).toMatchObject({
      repetitions: 3,
      intervalDays: 12,
      easeFactor: 1.85,
    });
  });

  test('good grows interval by the ease factor, ease unchanged', () => {
    expect(applyRating(base, 'good', today)).toMatchObject({
      repetitions: 3,
      intervalDays: 20,
      easeFactor: 2.0,
    });
  });

  test('easy grows interval by ease*1.3 and raises ease by 0.15', () => {
    expect(applyRating(base, 'easy', today)).toMatchObject({
      repetitions: 3,
      intervalDays: 26,
      easeFactor: 2.15,
    });
  });

  test('nextReviewDate is today plus the new interval in days', () => {
    expect(applyRating(base, 'good', today).nextReviewDate).toEqual(new Date('2026-12-03'));
  });

  test('lastRating echoes the rating passed in', () => {
    expect(applyRating(base, 'easy', today).lastRating).toBe('easy');
  });
});
