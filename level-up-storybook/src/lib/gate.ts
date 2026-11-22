import { GATE_BATCH_SIZE } from "@/config/learning";
import type { WordCard } from "@/mock/types";

export type Question = { card: WordCard; options: string[] };
export type Rng = () => number;

export function shuffle<T>(arr: T[], rng: Rng = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a;
}

// When a part has few words, wrong answers also come from other parts of the same story,
// so the same four answers do not show up on every question.
export const EXTRA_POOL_BELOW = 8;

// One question per card: the right meaning plus 3 meanings from other cards with a different word.
export function buildQuiz(cards: WordCard[], rng: Rng = Math.random, distractors = 3, extra: WordCard[] = []): Question[] {
  const all = cards.length < EXTRA_POOL_BELOW ? [...cards, ...extra] : cards;
  return shuffle(cards, rng).map((card) => {
    const pool = shuffle(
      [...new Set(all.filter((c) => c.word.toLowerCase() !== card.word.toLowerCase() && c.meaning !== card.meaning).map((c) => c.meaning))],
      rng,
    ).slice(0, distractors);
    return { card, options: shuffle([card.meaning, ...pool], rng) };
  });
}

// A perfect first batch can unlock early. Later batches always continue to the full quiz.
export const canOfferEarlyRead = (answered: number, wrong: number, total: number, batchSize = GATE_BATCH_SIZE) =>
  total > batchSize && answered === batchSize && wrong === 0;

// The quiz needs at least one word and four different meanings to choose from.
export const canRunQuiz = (cards: WordCard[], extra: WordCard[] = []) =>
  cards.length >= 1 && new Set([...cards, ...(cards.length < EXTRA_POOL_BELOW ? extra : [])].map((c) => c.meaning)).size >= 4;

export const resultRate = (correct: number, total: number) => (total === 0 ? 0 : correct / total);
export const hasPassed = (rate: number, threshold: number) => rate >= threshold;
export const canOverride = (failedAttempts: number, max: number) => failedAttempts >= max;
