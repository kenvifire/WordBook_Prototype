import { describe, expect, it } from "vitest";
import { buildQuiz, canOfferEarlyRead, canOverride, hasPassed, resultRate } from "./gate";

const cards = ["a", "b", "c", "d", "e"].map((w) => ({ id: w, word: w, meaning: `m-${w}`, example: "" }));
cards.push({ id: "a2", word: "A", meaning: "m-a-other", example: "" });

describe("gate quiz", () => {
  it("one question per card, four options with the right one", () => {
    const q = buildQuiz(cards);
    expect(q).toHaveLength(cards.length);
    for (const x of q) { expect(x.options).toHaveLength(4); expect(x.options).toContain(x.card.meaning); expect(new Set(x.options).size).toBe(4); }
  });
  it("never uses a card with the same word as a wrong option", () => {
    for (let i = 0; i < 30; i++) {
      const qa = buildQuiz(cards).find((x) => x.card.id === "a")!;
      expect(qa.options).not.toContain("m-a-other");
    }
  });
  it("passes at exactly the threshold (16/20 at 0.8), fails below", () => {
    expect(hasPassed(resultRate(16, 20), 0.8)).toBe(true);
    expect(hasPassed(resultRate(15, 20), 0.8)).toBe(false);
  });
  it("offers reading after a perfect first five, but not after an error or a later batch", () => {
    expect(canOfferEarlyRead(5, 0, 20)).toBe(true);
    expect(canOfferEarlyRead(5, 1, 20)).toBe(false);
    expect(canOfferEarlyRead(10, 0, 20)).toBe(false);
    expect(canOfferEarlyRead(5, 0, 5)).toBe(false);
  });
  it("Read anyway appears after 3 failed attempts", () => {
    expect(canOverride(2, 3)).toBe(false);
    expect(canOverride(3, 3)).toBe(true);
  });
});

describe("quiz with few words in a part", async () => {
  const { buildQuiz, canRunQuiz } = await import("./gate");
  const card = (id: string, word: string, meaning: string) => ({ id, word, meaning, example: "" });
  const few = [card("a", "ghost", "spirit"), card("b", "chain", "metal rings")];
  const others = [card("c", "castle", "big old house"), card("d", "moon", "light in the night sky"), card("e", "owl", "night bird"), card("f", "duke", "a noble man")];
  it("uses words from other parts as wrong answers when a part is small", () => {
    expect(canRunQuiz(few)).toBe(false);
    expect(canRunQuiz(few, others)).toBe(true);
    const qs = buildQuiz(few, Math.random, 3, others);
    expect(qs).toHaveLength(2); // one question per word of this part only
    for (const q of qs) { expect(q.options).toHaveLength(4); expect(new Set(q.options).size).toBe(4); expect(q.options).toContain(q.card.meaning); }
  });
  it("does not run without any word", () => {
    expect(canRunQuiz([], others)).toBe(false);
  });
});
