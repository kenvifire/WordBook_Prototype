import { REVIEW_SESSION_MAX } from "@/config/learning";

export type Due = { card_id: string; due: string; origin: "story" | "tap" };
const DAY = 86400000;

// Local calendar day key (YYYY-MM-DD) in the browser's time zone.
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Oldest due first, up to max; alternate tapped and story words when both exist.
export function pickSession(rows: Due[], now: Date, max = REVIEW_SESSION_MAX): string[] {
  const due = rows.filter((r) => new Date(r.due) <= now).sort((a, b) => a.due.localeCompare(b.due));
  const tap = due.filter((r) => r.origin === "tap"), story = due.filter((r) => r.origin !== "tap");
  const out: string[] = [];
  while (out.length < max && (tap.length || story.length)) {
    const first = out.length % 2 === 0 ? story : tap, second = first === story ? tap : story;
    out.push((first.shift() ?? second.shift())!.card_id);
  }
  return out;
}

export function dueCounts(rows: Due[], now: Date) {
  const endToday = startOfDay(now).getTime() + DAY;
  const t = (r: Due) => new Date(r.due).getTime();
  const nowDue = rows.filter((r) => t(r) <= now.getTime());
  return {
    now: nowDue.length,
    nowStory: nowDue.filter((r) => r.origin !== "tap").length,
    nowTap: nowDue.filter((r) => r.origin === "tap").length,
    today: rows.filter((r) => t(r) < endToday).length,
    tomorrow: rows.filter((r) => t(r) >= endToday && t(r) < endToday + DAY).length,
    week: rows.filter((r) => t(r) < endToday + 6 * DAY).length,
  };
}

// Consecutive local days with activity, counting back from today. No activity yet today does not break it.
export function streak(timestamps: string[], now: Date): number {
  const days = new Set(timestamps.map((ts) => dayKey(new Date(ts))));
  const d = startOfDay(now);
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
