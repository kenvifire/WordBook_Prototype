// AI adaptation of a team story part to another reading level. Pure functions: prompt + safety check.
// The team reviews every AI version before learners can see it (status "draft" until approved).
import type { Level } from "@/mock/types";

const GUIDE: Record<Level, string> = {
  A2: "Use only very common, everyday words (about the 1,500 most frequent English words). Short sentences of 6 to 12 words. Mostly present simple and past simple. No idioms: say the meaning in plain words. Explain a hard idea with easy words instead of using a hard word.",
  B1: "Use common words (about the 3,000 most frequent). Clear sentences of up to about 18 words. Common tenses. Replace rare words and idioms with simpler ones, but keep some colour of the original.",
  B2: "Use natural English with a wide vocabulary. Longer sentences are fine. Keep most of the author's style; replace only very rare or old-fashioned words.",
  C1: "Use rich, natural literary English, close to the author's original style and vocabulary. Complex sentences are fine. If you know the original public-domain text of this passage, stay close to its wording; never invent new events or details.",
};

// Allowed length change (words of the new text / words of the source text).
const LENGTH: Record<Level, [number, number]> = { A2: [0.45, 1.3], B1: [0.6, 1.4], B2: [0.75, 1.6], C1: [0.8, 1.9] };

export function buildAdaptPrompt(input: { text: string; from: Level; to: Level; title: string; author: string }): string {
  return [
    `You adapt classic public-domain stories for adult learners of English. Story: "${input.title}" by ${input.author}.`,
    `Rewrite the passage below, now written for level ${input.from}, for CEFR level ${input.to}.`,
    `Level ${input.to}: ${GUIDE[input.to]}`,
    "Rules: keep every event, character, name and the order of events. Do not add new events, opinions or explanations for the reader. Keep dialogue as dialogue. Keep paragraphs (one blank line between them).",
    "Write in modern, respectful language: soften dated or offensive expressions without changing what happens.",
    "Answer with the adapted passage only, nothing before or after it.",
    "",
    "PASSAGE:",
    input.text,
  ].join("\n");
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

// Returns the adapted text if it looks like a real adaptation, otherwise null.
export function acceptAdaptation(source: string, answer: string, to: Level): string | null {
  let t = answer.trim().replace(/^```[a-z]*\s*([\s\S]*?)\s*```$/i, "$1").trim();
  const first = t.split("\n")[0] ?? "";
  if (first.length < 100 && /:\s*$/.test(first) && /adapt|passage|here|level|version/i.test(first)) t = t.slice(first.length).trim();
  t = t.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!t || /^(PASSAGE|TEXT):/im.test(t)) return null;
  const ratio = words(t) / Math.max(1, words(source));
  const [lo, hi] = LENGTH[to];
  if (ratio < lo || ratio > hi) return null;
  return t;
}
