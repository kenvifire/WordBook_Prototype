import { describe, expect, it } from "vitest";
import { markJustUnlocked, takeJustUnlocked } from "./just-unlocked";

describe("just unlocked parts", () => {
  it("is shown once for the parts of this story", () => {
    markJustUnlocked("s2");
    markJustUnlocked("other-story-s5");
    expect(takeJustUnlocked(["s1", "s2", "s3"])).toEqual(["s2"]);
    expect(takeJustUnlocked(["s1", "s2", "s3"])).toEqual([]);
    expect(takeJustUnlocked(["other-story-s5"])).toEqual(["other-story-s5"]);
  });
});
