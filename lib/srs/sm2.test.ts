import { describe, test, expect } from 'vitest';
import { INITIAL_SM2_STATE, nextSM2State } from './sm2';

test('good from the initial state: repetitions=1, interval=1, ease factor unchanged', () => {
  expect(nextSM2State(INITIAL_SM2_STATE, 'good')).toEqual({ easeFactor: 2.5, interval: 1, repetitions: 1 });
});

test('three consecutive good grades grow the interval 1 -> 6 -> 15, ease factor stays 2.5', () => {
  let state = INITIAL_SM2_STATE;
  state = nextSM2State(state, 'good');
  state = nextSM2State(state, 'good');
  state = nextSM2State(state, 'good');
  expect(state).toEqual({ easeFactor: 2.5, interval: 15, repetitions: 3 });
});

test('again resets repetitions and interval to 1 and lowers the ease factor', () => {
  const state = { easeFactor: 2.5, interval: 6, repetitions: 2 };
  expect(nextSM2State(state, 'again')).toEqual({ easeFactor: 1.7, interval: 1, repetitions: 0 });
});

test('easy raises the ease factor by 0.1 from the initial state', () => {
  expect(nextSM2State(INITIAL_SM2_STATE, 'easy')).toEqual({ easeFactor: 2.6, interval: 1, repetitions: 1 });
});

test('ease factor never drops below 1.3', () => {
  const state = { easeFactor: 1.35, interval: 1, repetitions: 0 };
  expect(nextSM2State(state, 'again').easeFactor).toBe(1.3);
});
