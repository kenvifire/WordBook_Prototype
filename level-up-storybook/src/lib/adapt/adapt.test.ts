import { describe, expect, it } from "vitest";
import { acceptAdaptation, buildAdaptPrompt } from "./adapt";

const source = Array.from({ length: 10 }, (_, i) => `Alice sat by her sister on the bank number ${i}, with nothing to do.`).join(" ");

describe("level adaptation with AI", () => {
  it("prompt names the story, both levels and the level guide, and ends with the passage", () => {
    const p = buildAdaptPrompt({ text: source, from: "B1", to: "A2", title: "Alice in Wonderland", author: "Lewis Carroll" });
    expect(p).toContain('"Alice in Wonderland" by Lewis Carroll');
    expect(p).toContain("now written for level B1, for CEFR level A2");
    expect(p).toContain("1,500 most frequent");
    expect(p).toContain("keep every event");
    expect(p.endsWith(source)).toBe(true);
    expect(buildAdaptPrompt({ text: source, from: "B2", to: "C1", title: "t", author: "a" })).toContain("original public-domain text");
  });
  it("accepts a plausible adaptation and removes a lead-in line", () => {
    const a2 = Array.from({ length: 8 }, () => "Alice sat with her sister. She had nothing to do.").join(" ");
    expect(acceptAdaptation(source, "Here is the adapted passage:\n\n" + a2, "A2")).toBe(a2);
    expect(acceptAdaptation(source, "```\n" + a2 + "\n```", "A2")).toBe(a2);
  });
  it("rejects answers that are far too short or too long for the level, or empty", () => {
    expect(acceptAdaptation(source, "Alice was bored.", "A2")).toBeNull();
    expect(acceptAdaptation(source, source + " " + source, "A2")).toBeNull(); // A2 should not double in length
    expect(acceptAdaptation(source, source + " " + source.slice(0, source.length / 2), "C1")).not.toBeNull(); // C1 may be longer
    expect(acceptAdaptation(source, "   ", "C1")).toBeNull();
  });
});
