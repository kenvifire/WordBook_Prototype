import { REQUEUE_AFTER_CARDS, SRS_INTERVALS_DAYS } from "@/config/learning";

export type Rating = "dont_know" | "almost" | "know";
export type Progress = { box: number; lapses: number };
export type Scheduled = { box: number; lapses: number; due: Date; last_rating: Rating; mastered: boolean };

const DAY = 24 * 60 * 60 * 1000;
const LAST_BOX = SRS_INTERVALS_DAYS.length - 1;

// Pure scheduler: "know" moves up one box, "almost" keeps it, "dont_know" resets to 0 and adds a lapse.
export function schedule(prev: Progress | null, rating: Rating, now: Date): Scheduled {
  const p = prev ?? { box: 0, lapses: 0 };
  const box = rating === "know" ? Math.min(p.box + 1, LAST_BOX) : rating === "almost" ? p.box : 0;
  const lapses = rating === "dont_know" ? p.lapses + 1 : p.lapses;
  return { box, lapses, due: new Date(now.getTime() + SRS_INTERVALS_DAYS[box]! * DAY), last_rating: rating, mastered: box === LAST_BOX };
}

// Session queue: the current card is at index 0. "know" removes it; others reinsert it after N other cards.
export function requeue<T>(queue: T[], rating: Rating): T[] {
  const [head, ...rest] = queue;
  if (head === undefined) return [];
  if (rating === "know") return rest;
  const at = Math.min(REQUEUE_AFTER_CARDS[rating], rest.length);
  return [...rest.slice(0, at), head, ...rest.slice(at)];
}
