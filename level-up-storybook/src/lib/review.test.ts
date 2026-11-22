import { describe, expect, it } from "vitest";
import { dueCounts, pickSession, streak, type Due } from "./review";
import { REVIEW_SESSION_MAX } from "@/config/learning";

const now = new Date(2026, 10, 19, 15, 0);
const at = (dDays: number, h = 12) => new Date(2026, 10, 19 + dDays, h).toISOString();

describe("review session", () => {
  it("max is 20", () => expect(REVIEW_SESSION_MAX).toBe(20));
  it("takes at most 20 due cards, oldest first", () => {
    const rows: Due[] = Array.from({ length: 30 }, (_, i) => ({ card_id: `c${i}`, due: at(-30 + i), origin: "story" }));
    const s = pickSession(rows, now);
    expect(s.length).toBe(20); expect(s[0]).toBe("c0");
  });
  it("skips cards not due yet", () => expect(pickSession([{ card_id: "a", due: at(1), origin: "story" }], now)).toEqual([]));
  it("interleaves tapped and story words", () => {
    const rows: Due[] = [{ card_id: "s1", due: at(-3), origin: "story" }, { card_id: "s2", due: at(-2), origin: "story" }, { card_id: "t1", due: at(-1), origin: "tap" }];
    expect(pickSession(rows, now)).toEqual(["s1", "t1", "s2"]);
  });
  it("counts tomorrow separately", () => expect(dueCounts([{ card_id: "a", due: at(1, 9), origin: "story" }], now).tomorrow).toBe(1));
});

describe("streak", () => {
  it("counts consecutive days including today", () => expect(streak([at(0), at(-1), at(-2), at(-4)], now)).toBe(3));
  it("no activity today yet keeps yesterday's streak", () => expect(streak([at(-1), at(-2)], now)).toBe(2));
  it("a missed day breaks it", () => expect(streak([at(-2), at(-3)], now)).toBe(0));
});
