import { describe, expect, it } from "vitest";
import { WORDS_PER_MINUTE, isSectionOpen, readingMinutes } from "./stories";
import type { Section, StoryVersion } from "./stories";

const sec = (id: string, words: number): Section => ({ id, storyId: "x", level: "B1", order: 1, title: "", text: Array(words).fill("w").join(" "), cards: [] });

describe("reading time and unlocking", () => {
  it("uses 120 words per minute", () => {
    expect(WORDS_PER_MINUTE).toBe(120);
    const v: StoryVersion = { id: "v", storyId: "x", level: "B1", status: "approved", sections: [sec("a", 120), sec("b", 121)] };
    expect(readingMinutes(v)).toBe(3);
  });
  it("section 1 is open, later ones need the previous section unlocked", () => {
    const s = [sec("a", 1), sec("b", 1), sec("c", 1)];
    expect(isSectionOpen(s, 0, [])).toBe(true);
    expect(isSectionOpen(s, 1, [])).toBe(false);
    expect(isSectionOpen(s, 1, ["a"])).toBe(true);
    expect(isSectionOpen(s, 2, ["a"])).toBe(false);
  });
});

import { translationFor } from "./stories";
describe("translation matching", () => {
  const card = { translations: { Spanish: "conejo", Chinese: "兔子", Polish: "królik" } };
  it("Spanish learner sees Spanish", () => expect(translationFor(card, "Spanish")).toBe("conejo"));
  it("Chinese learner sees Chinese", () => expect(translationFor(card, "Chinese")).toBe("兔子"));
  it("Polish learner sees Polish", () => expect(translationFor(card, "Polish")).toBe("królik"));
  it("French learner sees nothing", () => expect(translationFor(card, "French")).toBeNull());
});
