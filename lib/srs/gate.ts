import type { CardState, GateStatus } from '@/lib/types';

export const RECOGNITION_THRESHOLD = 0.8;

export function isRecognized(card: CardState): boolean {
  return card.lastGrade !== null && card.lastGrade !== 'again';
}

export function computeGateStatus(cards: CardState[], threshold = RECOGNITION_THRESHOLD): GateStatus {
  if (cards.length === 0) {
    return { recognizedCount: 0, totalCount: 0, recognitionRate: 1, passed: true };
  }
  const recognizedCount = cards.filter(isRecognized).length;
  const totalCount = cards.length;
  const recognitionRate = recognizedCount / totalCount;
  return { recognizedCount, totalCount, recognitionRate, passed: recognitionRate >= threshold };
}
