// Placement test: form sampling and scoring. Pure functions (the bank is passed in), so they are easy to test.
// Rules from WordBook_Placement_Test.md §2. All thresholds are starting hypotheses to calibrate with real learners.

export type Band = "A2" | "B1" | "B2" | "C1";
export type SelfBand = Band | "unsure";
export const BANDS: Band[] = ["A2", "B1", "B2", "C1"];
const WEIGHT: Record<Band, number> = { A2: 1, B1: 2, B2: 3, C1: 4 };

// Form composition: 20 real words + 10 fake words, 8 sentences.
export const VOCAB_PER_BAND: Record<Band, number> = { A2: 4, B1: 6, B2: 6, C1: 4 };
export const FAKE_WORDS = 10;
export const GRAMMAR_PER_BAND: Record<Band, number> = { A2: 1, B1: 2, B2: 3, C1: 2 };

export const CUTS = { B1: 0.25, B2: 0.5, C1: 0.8 } as const;
export const BORDER = 0.04;
export const MAX_FALSE_ALARM = 0.3;
export const VOCAB_WEIGHT = 0.6;

type WordItem = { id: string; text: string; band: Band | null };
type GrammarItem = { id: string; band: Band; tag: string; text: string; options: readonly string[]; correct: string };
export type Rng = () => number;

function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a;
}

// ---------- Form (what the browser gets: no bands, no answers) ----------
export type PlacementForm = { version: string; vocab: { id: string; text: string }[]; grammar: { id: string; text: string; options: string[] }[] };

export function buildForm(words: WordItem[], grammar: GrammarItem[], version: string, rng: Rng = Math.random): PlacementForm {
  const real = BANDS.flatMap((b) => shuffle(words.filter((w) => w.band === b), rng).slice(0, VOCAB_PER_BAND[b]));
  const fake = shuffle(words.filter((w) => w.band === null), rng).slice(0, FAKE_WORDS);
  const g = BANDS.flatMap((b) => shuffle(grammar.filter((x) => x.band === b), rng).slice(0, GRAMMAR_PER_BAND[b]));
  return {
    version,
    vocab: shuffle([...real, ...fake], rng).map((w) => ({ id: w.id, text: w.text })),
    // Easier sentences first; options shuffled.
    grammar: g.map((x) => ({ id: x.id, text: x.text, options: shuffle(x.options, rng) })),
  };
}

// ---------- Submission ----------
export type Submission = { self_band: SelfBand; vocab: { item_id: string; known: boolean }[]; grammar: { item_id: string; answer: string | null }[] };
export type PlacementError =
  | "invalid_payload" | "invalid_self_band" | "unknown_vocab_item" | "unknown_grammar_item" | "duplicate_item"
  | "invalid_vocab_answer" | "invalid_grammar_answer" | "wrong_vocab_composition" | "wrong_grammar_composition";

export type PlacementResult = {
  level: Band; assigned_level: Band;
  confidence: "high" | "medium" | "low"; flags: string[]; composite: number;
  vocab: { score: number; false_alarm_rate: number; by_band: Record<Band, number> };
  grammar: { score: number; correct_by_band: Record<Band, number>; errors: { item_id: string; tag: string; band: Band }[] };
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const round3 = (x: number) => Math.round(x * 1000) / 1000;
export const levelFor = (score: number): Band => (score >= CUTS.C1 ? "C1" : score >= CUTS.B2 ? "B2" : score >= CUTS.B1 ? "B1" : "A2");

// Checks that the answer sheet matches a real form (right items, right numbers per band, valid answers).
export function validate(sub: unknown, words: WordItem[], grammar: GrammarItem[]): { ok: true; sub: Submission } | { ok: false; error: PlacementError } {
  const s = sub as Partial<Submission> | null;
  if (!s || typeof s !== "object" || !Array.isArray(s.vocab) || !Array.isArray(s.grammar)) return { ok: false, error: "invalid_payload" };
  if (!["A2", "B1", "B2", "C1", "unsure"].includes(s.self_band as string)) return { ok: false, error: "invalid_self_band" };
  const wordById = new Map(words.map((w) => [w.id, w]));
  const gById = new Map(grammar.map((g) => [g.id, g]));
  const seen = new Set<string>();
  const vocabCount: Record<string, number> = { A2: 0, B1: 0, B2: 0, C1: 0, fake: 0 };
  for (const v of s.vocab) {
    const w = wordById.get(v?.item_id);
    if (!w) return { ok: false, error: "unknown_vocab_item" };
    if (seen.has(w.id)) return { ok: false, error: "duplicate_item" };
    if (typeof v.known !== "boolean") return { ok: false, error: "invalid_vocab_answer" };
    seen.add(w.id); vocabCount[w.band ?? "fake"]!++;
  }
  if (BANDS.some((b) => vocabCount[b] !== VOCAB_PER_BAND[b]) || vocabCount["fake"] !== FAKE_WORDS) return { ok: false, error: "wrong_vocab_composition" };
  const gCount: Record<string, number> = { A2: 0, B1: 0, B2: 0, C1: 0 };
  for (const a of s.grammar) {
    const g = gById.get(a?.item_id);
    if (!g) return { ok: false, error: "unknown_grammar_item" };
    if (seen.has(g.id)) return { ok: false, error: "duplicate_item" };
    if (!(a.answer === null || g.options.includes(a.answer as string))) return { ok: false, error: "invalid_grammar_answer" };
    seen.add(g.id); gCount[g.band]!++;
  }
  if (BANDS.some((b) => gCount[b] !== GRAMMAR_PER_BAND[b])) return { ok: false, error: "wrong_grammar_composition" };
  return { ok: true, sub: { self_band: s.self_band as SelfBand, vocab: s.vocab, grammar: s.grammar } };
}

export function score(sub: Submission, words: WordItem[], grammar: GrammarItem[]): PlacementResult {
  const wordById = new Map(words.map((w) => [w.id, w]));
  const gById = new Map(grammar.map((g) => [g.id, g]));

  // Vocabulary: hit rate per band, corrected for guessing with the false-alarm rate on fake words.
  const fakes = sub.vocab.filter((v) => wordById.get(v.item_id)!.band === null);
  const F = fakes.length ? fakes.filter((v) => v.known).length / fakes.length : 0;
  const by_band = {} as Record<Band, number>;
  for (const b of BANDS) {
    const items = sub.vocab.filter((v) => wordById.get(v.item_id)!.band === b);
    const hit = items.length ? items.filter((v) => v.known).length / items.length : 0;
    by_band[b] = round3(F >= 1 ? 0 : clamp01((hit - F) / (1 - F)));
  }
  const totalW = BANDS.reduce((n, b) => n + WEIGHT[b], 0);
  const V = BANDS.reduce((n, b) => n + by_band[b] * WEIGHT[b], 0) / totalW;

  // Grammar: weighted share correct ("not sure" counts as not correct).
  const correct_by_band = { A2: 0, B1: 0, B2: 0, C1: 0 } as Record<Band, number>;
  const errors: PlacementResult["grammar"]["errors"] = [];
  let gotW = 0, allW = 0;
  for (const a of sub.grammar) {
    const g = gById.get(a.item_id)!;
    allW += WEIGHT[g.band];
    if (a.answer === g.correct) { correct_by_band[g.band]++; gotW += WEIGHT[g.band]; }
    else errors.push({ item_id: g.id, tag: g.tag, band: g.band });
  }
  const G = allW ? gotW / allW : 0;

  const flags: string[] = [];
  let confidence: PlacementResult["confidence"] = "high";
  let composite = VOCAB_WEIGHT * V + (1 - VOCAB_WEIGHT) * G;
  let level = levelFor(composite);

  if (F > MAX_FALSE_ALARM) {
    // Too many fake words marked as known: ignore vocabulary, use grammar, never above the learner's own rating.
    flags.push("unreliable_vocabulary");
    confidence = "low";
    composite = G;
    level = levelFor(G);
    if (sub.self_band !== "unsure" && BANDS.indexOf(level) > BANDS.indexOf(sub.self_band)) level = sub.self_band;
  } else if (Object.values(CUTS).some((cut) => Math.abs(composite - cut) < BORDER)) {
    flags.push("borderline");
    confidence = "medium";
  }

  if (sub.self_band !== "unsure" && Math.abs(BANDS.indexOf(sub.self_band) - BANDS.indexOf(level)) >= 2) flags.push("self_rating_mismatch");

  // The app offers A2-C1. A result just above a cut starts one level lower (easier first, the quiz gates adjust).
  let assigned_level: Band = level;
  const cut = level === "A2" ? null : CUTS[level];
  if (cut !== null && !flags.includes("unreliable_vocabulary") && composite - cut < BORDER) {
    assigned_level = BANDS[BANDS.indexOf(level) - 1]!;
    flags.push("borderline_starts_lower");
  }

  return {
    level, assigned_level, confidence, flags, composite: round3(composite),
    vocab: { score: round3(V), false_alarm_rate: round3(F), by_band },
    grammar: { score: round3(G), correct_by_band, errors },
  };
}
