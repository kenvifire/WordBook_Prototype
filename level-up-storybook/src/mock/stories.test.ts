import { describe, expect, it } from "vitest";
import { stories } from "./stories";

describe("mock stories", () => {
  it("has 3 stories: fantasy, mystery, funny", () => {
    expect(stories.map((s) => s.genre).sort()).toEqual(["fantasy", "funny", "mystery"]);
  });
  it("each story has B1 and B2 levels", () => {
    for (const s of stories) expect(s.versions.map((v) => v.level)).toEqual(["B1", "B2"]);
  });
  it("each level has 3 sections with 20 word cards", () => {
    for (const v of stories.flatMap((s) => s.versions)) {
      expect(v.sections).toHaveLength(3);
      for (const sec of v.sections) expect(sec.cards).toHaveLength(20);
    }
  });
});
