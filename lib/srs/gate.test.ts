import { describe, test, expect } from 'vitest';
import { computeGateStatus } from './gate';
import type { CardState } from '@/lib/types';

const card = (lastGrade: CardState['lastGrade']): CardState => ({
  id: 'x', sectionId: 'sec', token: 't', easeFactor: 2.5, interval: 1, repetitions: 1, lastGrade, dueAt: '2026-01-01T00:00:00.000Z',
});

test('an empty section auto-passes the gate', () => {
  expect(computeGateStatus([])).toEqual({ recognizedCount: 0, totalCount: 0, recognitionRate: 1, passed: true });
});

test('passes exactly at the 80% default threshold', () => {
  const cards = [card('good'), card('good'), card('good'), card('good'), card('again')];
  expect(computeGateStatus(cards)).toEqual({ recognizedCount: 4, totalCount: 5, recognitionRate: 0.8, passed: true });
});

test('fails below the threshold', () => {
  const cards = [card('good'), card('again'), card('again'), card('again'), card('again')];
  expect(computeGateStatus(cards).passed).toBe(false);
});

test('a never-reviewed card (lastGrade null) does not count as recognized', () => {
  expect(computeGateStatus([card(null)]).recognizedCount).toBe(0);
});
