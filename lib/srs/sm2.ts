import type { Grade, SM2State } from '../types';

export const INITIAL_SM2_STATE: SM2State = { easeFactor: 2.5, interval: 0, repetitions: 0 };

export function gradeToQuality(grade: Grade): number {
  switch (grade) {
    case 'again':
      return 0;
    case 'hard':
      return 3;
    case 'good':
      return 4;
    case 'easy':
      return 5;
  }
}

export function nextSM2State(state: SM2State, grade: Grade): SM2State {
  const q = gradeToQuality(grade);
  let easeFactor = state.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  easeFactor = Math.round(Math.max(1.3, easeFactor) * 100) / 100;
  let { interval, repetitions } = state;
  if (q < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;
    interval = repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(interval * easeFactor);
  }
  return { easeFactor, interval, repetitions };
}
