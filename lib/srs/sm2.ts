export type Rating = 'again' | 'hard' | 'good' | 'easy';

export type SrsState = {
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
};

export type SrsResult = SrsState & {
  nextReviewDate: Date;
  lastRating: Rating;
};

const MIN_EASE_FACTOR = 1.3;

// Date-only arithmetic, done in UTC so the result doesn't depend on the host's
// local timezone (the inputs/outputs in this module are always date-only).
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function applyRating(state: SrsState, rating: Rating, today: Date): SrsResult {
  const { repetitions, easeFactor, intervalDays } = state;

  let nextRepetitions: number;
  let nextEaseFactor: number;
  let nextIntervalDays: number;

  switch (rating) {
    case 'again':
      nextRepetitions = 0;
      nextIntervalDays = 1;
      nextEaseFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.2);
      break;
    case 'hard':
      nextRepetitions = repetitions + 1;
      nextIntervalDays = Math.round(intervalDays * 1.2);
      nextEaseFactor = Math.max(MIN_EASE_FACTOR, easeFactor - 0.15);
      break;
    case 'good':
      nextRepetitions = repetitions + 1;
      nextIntervalDays = Math.round(intervalDays * easeFactor);
      nextEaseFactor = easeFactor;
      break;
    case 'easy':
      nextRepetitions = repetitions + 1;
      nextIntervalDays = Math.round(intervalDays * easeFactor * 1.3);
      nextEaseFactor = easeFactor + 0.15;
      break;
  }

  return {
    repetitions: nextRepetitions,
    easeFactor: nextEaseFactor,
    intervalDays: nextIntervalDays,
    nextReviewDate: addDays(today, nextIntervalDays),
    lastRating: rating,
  };
}
