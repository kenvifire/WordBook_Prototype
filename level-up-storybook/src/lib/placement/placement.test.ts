import { describe, expect, it } from "vitest";
import { BANK_VERSION, GRAMMAR, WORDS } from "./bank.server";
import { buildForm, score, validate, type Submission } from "./scoring";

const band = (id: string) => { const w = WORDS.find((x) => x.id === id); return w ? w.band : GRAMMAR.find((g) => g.id === id)?.band; };
const seeded = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

// A learner who answers by rule: which real-word bands they know, which fakes they claim, which sentence bands they get right.
function answer(form = buildForm(WORDS, GRAMMAR, BANK_VERSION, seeded(7)), o: { know: (b: string | null, i: number) => boolean; right: (b: string, i: number) => boolean; self?: Submission["self_band"] }): Submission {
  const count: Record<string, number> = {};
  const next = (k: string) => (count[k] = (count[k] ?? 0) + 1) - 1;
  return {
    self_band: o.self ?? "B1",
    vocab: form.vocab.map((v) => { const b = band(v.id) ?? null; return { item_id: v.id, known: o.know(b, next(`v${b}`)) }; }),
    grammar: form.grammar.map((g) => { const item = GRAMMAR.find((x) => x.id === g.id)!; return { item_id: g.id, answer: o.right(item.band, next(`g${item.band}`)) ? item.correct : item.options.find((x) => x !== item.correct)! }; }),
  };
}

describe("placement bank", () => {
  it("has the bank from the design doc", () => {
    expect(WORDS.filter((w) => w.band !== null)).toHaveLength(48);
    expect(WORDS.filter((w) => w.band === null)).toHaveLength(24);
    expect(GRAMMAR).toHaveLength(11);
    for (const g of GRAMMAR) { expect(new Set(g.options).size).toBe(4); expect(g.options).toContain(g.correct); }
    expect(new Set(WORDS.map((w) => w.id)).size).toBe(WORDS.length);
  });
});

describe("placement form", () => {
  it("has 20 real + 10 fake words and 8 sentences, with no answers or bands", () => {
    const f = buildForm(WORDS, GRAMMAR, BANK_VERSION);
    expect(f.vocab).toHaveLength(30);
    expect(f.vocab.filter((v) => band(v.id) === null)).toHaveLength(10);
    expect(["A2", "B1", "B2", "C1"].map((b) => f.vocab.filter((v) => band(v.id) === b).length)).toEqual([4, 6, 6, 4]);
    expect(["A2", "B1", "B2", "C1"].map((b) => f.grammar.filter((g) => band(g.id) === b).length)).toEqual([1, 2, 3, 2]);
    const json = JSON.stringify(f);
    for (const k of ["correct", "band", "tag"]) expect(json).not.toContain(`"${k}"`);
  });
  it("changes from one test to the next", () => {
    expect(JSON.stringify(buildForm(WORDS, GRAMMAR, "v", seeded(1)))).not.toBe(JSON.stringify(buildForm(WORDS, GRAMMAR, "v", seeded(2))));
  });
});

describe("placement scoring", () => {
  it("places a typical B1 learner at B1 with high confidence", () => {
    // knows all A2/B1 words, half of B2, no C1, claims no fake words; sentences right up to B1 and 1 of 3 B2.
    const sub = answer(undefined, { know: (b, i) => b === "A2" || b === "B1" || (b === "B2" && i < 3), right: (b, i) => b === "A2" || b === "B1" || (b === "B2" && i === 0) });
    const r = score(sub, WORDS, GRAMMAR);
    expect(r.vocab.false_alarm_rate).toBe(0);
    expect(r.vocab.score).toBe(0.45);
    expect(r.grammar.score).toBeCloseTo(8 / 22, 3);
    expect(r).toMatchObject({ level: "B1", assigned_level: "B1", confidence: "high" });
    expect(r.grammar.errors.map((e) => e.band)).toEqual(["B2", "B2", "C1", "C1"]);
  });
  it("corrects for guessing when fake words are claimed", () => {
    const honest = score(answer(undefined, { know: (b, i) => b === "A2" || b === "B1" || (b === "B2" && i < 3), right: () => false }), WORDS, GRAMMAR);
    const guesser = score(answer(undefined, { know: (b, i) => b === "A2" || b === "B1" || (b === "B2" && i < 3) || (b === null && i < 2), right: () => false }), WORDS, GRAMMAR);
    expect(guesser.vocab.false_alarm_rate).toBe(0.2);
    expect(guesser.vocab.by_band.B2).toBe(0.375); // (0.5 - 0.2) / (1 - 0.2)
    expect(guesser.vocab.score).toBeLessThan(honest.vocab.score);
  });
  it("ignores vocabulary when too many fake words are claimed, and stays at or below the self-rating", () => {
    const r = score(answer(undefined, { know: () => true, right: () => true, self: "B2" }), WORDS, GRAMMAR);
    expect(r.flags).toContain("unreliable_vocabulary");
    expect(r.confidence).toBe("low");
    expect(r.level).toBe("B2"); // grammar alone says C1, capped by self-rating B2
  });
  it("gives A2 and C1 as real levels", () => {
    const low = score(answer(undefined, { know: () => false, right: () => false, self: "A2" }), WORDS, GRAMMAR);
    expect(low).toMatchObject({ level: "A2", assigned_level: "A2" });
    const high = score(answer(undefined, { know: (b) => b !== null, right: () => true, self: "C1" }), WORDS, GRAMMAR);
    expect(high).toMatchObject({ level: "C1", assigned_level: "C1" });
  });
  it("starts a result just above a cut one level lower", () => {
    // all A2/B1/B2 words, no C1 words; grammar: A2 + B1 + 1 of 3 B2 → composite just above 0.5
    const r = score(answer(undefined, { know: (b) => b === "A2" || b === "B1" || b === "B2", right: (b, i) => b === "A2" || b === "B1" || (b === "B2" && i === 0) }), WORDS, GRAMMAR);
    expect(r.level).toBe("B2");
    expect(r.composite).toBeLessThan(0.54);
    expect(r.assigned_level).toBe("B1");
    expect(r.flags).toContain("borderline_starts_lower");
    expect(r.confidence).toBe("medium");
  });
  it("flags a self-rating two levels away", () => {
    const r = score(answer(undefined, { know: () => false, right: () => false, self: "B2" }), WORDS, GRAMMAR);
    expect(r.flags).toContain("self_rating_mismatch");
  });
});

describe("placement answer sheet checks", () => {
  const good = answer(undefined, { know: () => false, right: () => false });
  it("accepts a complete sheet", () => {
    expect(validate(good, WORDS, GRAMMAR).ok).toBe(true);
  });
  it.each([
    ["no body", null, "invalid_payload"],
    ["bad self rating", { ...good, self_band: "expert" }, "invalid_self_band"],
    ["unknown word", { ...good, vocab: [{ item_id: "ZZZ", known: true }, ...good.vocab.slice(1)] }, "unknown_vocab_item"],
    ["duplicate word", { ...good, vocab: [good.vocab[0], ...good.vocab.slice(0, -1)] }, "duplicate_item"],
    ["missing word", { ...good, vocab: good.vocab.slice(1) }, "wrong_vocab_composition"],
    ["bad word answer", { ...good, vocab: [{ ...good.vocab[0], known: "yes" }, ...good.vocab.slice(1)] }, "invalid_vocab_answer"],
    ["unknown sentence", { ...good, grammar: [{ item_id: "G999", answer: null }, ...good.grammar.slice(1)] }, "unknown_grammar_item"],
    ["made-up answer", { ...good, grammar: [{ ...good.grammar[0], answer: "banana" }, ...good.grammar.slice(1)] }, "invalid_grammar_answer"],
    ["missing sentence", { ...good, grammar: good.grammar.slice(1) }, "wrong_grammar_composition"],
  ])("rejects %s", (_name, sheet, error) => {
    expect(validate(sheet, WORDS, GRAMMAR)).toEqual({ ok: false, error });
  });
  it("accepts 'I'm not sure' (null) as a sentence answer", () => {
    expect(validate({ ...good, grammar: good.grammar.map((g) => ({ ...g, answer: null })) }, WORDS, GRAMMAR).ok).toBe(true);
  });
});
