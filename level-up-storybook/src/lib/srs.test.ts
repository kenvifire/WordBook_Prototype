import { describe, expect, it } from "vitest";
import { requeue, schedule } from "./srs";

const now = new Date("2026-01-01T00:00:00Z");
const days = (d: Date) => (d.getTime() - now.getTime()) / 86400000;

describe("schedule", () => {
  it("know moves box 0 to 1, due in 1 day", () => { const r = schedule(null, "know", now); expect(r.box).toBe(1); expect(days(r.due)).toBe(1); });
  it("almost keeps the box", () => { expect(schedule({ box: 2, lapses: 0 }, "almost", now).box).toBe(2); });
  it("dont_know resets to box 0 and adds a lapse", () => { const r = schedule({ box: 3, lapses: 1 }, "dont_know", now); expect(r.box).toBe(0); expect(r.lapses).toBe(2); expect(days(r.due)).toBe(0); });
  it("box stops at the last interval (14 days)", () => { const r = schedule({ box: 4, lapses: 0 }, "know", now); expect(r.box).toBe(4); expect(days(r.due)).toBe(14); });
});

describe("requeue", () => {
  const q = ["a", "b", "c", "d", "e", "f", "g", "h"];
  it("know removes the card", () => expect(requeue(q, "know")).toEqual(q.slice(1)));
  it("dont_know comes back after 3 cards", () => expect(requeue(q, "dont_know").indexOf("a")).toBe(3));
  it("almost comes back after 6 cards", () => expect(requeue(q, "almost").indexOf("a")).toBe(6));
});
