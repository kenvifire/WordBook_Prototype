// AI clean-up for parts of scanned books (OCR errors). Pure functions: prompt + safety check.
// The check makes sure the AI only fixed errors and did not rewrite, shorten or add text.

export function buildCleanupPrompt(text: string): string {
  return [
    "This text comes from a scanned book. Text recognition (OCR) made errors. Fix ONLY those errors:",
    "- wrong letters or symbols inside words (for example \"Cltarlotte\" → \"Charlotte\", \"perltaps\" → \"perhaps\", \"P\"\"ople\" → \"People\");",
    "- words split by a space (\"th is\" → \"this\", \"hall s\" → \"halls\") or joined by mistake;",
    "- a missing first letter of a chapter (a large first letter in the book);",
    "- stray symbols, dots or marks that are not part of the text, page numbers and running page titles.",
    "Rules: do not rewrite, modernize, shorten, explain or add anything. Keep the author's words, spelling style and punctuation.",
    "Keep every paragraph. Separate paragraphs with one blank line. Join lines that belong to the same paragraph.",
    "Answer with the corrected text only, nothing before or after it.",
    "",
    "TEXT:",
    text,
  ].join("\n");
}

const letterBigrams = (s: string) => {
  const t = s.toLowerCase().replace(/[^a-z]/g, "");
  const m = new Map<string, number>();
  for (let i = 0; i < t.length - 1; i++) { const b = t.slice(i, i + 2); m.set(b, (m.get(b) ?? 0) + 1); }
  return { m, n: Math.max(0, t.length - 1) };
};

// Dice similarity of letter pairs: 1 = same letters in the same order, small edits stay above 0.9.
export function letterSimilarity(a: string, b: string): number {
  const A = letterBigrams(a), B = letterBigrams(b);
  if (!A.n || !B.n) return 0;
  let shared = 0;
  for (const [k, v] of A.m) shared += Math.min(v, B.m.get(k) ?? 0);
  return (2 * shared) / (A.n + B.n);
}

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

// Returns the cleaned text if it is a safe correction of the original, otherwise null (keep the original).
export function acceptCleanup(original: string, answer: string): string | null {
  let t = answer.trim().replace(/^```[a-z]*\s*([\s\S]*?)\s*```$/i, "$1").trim();
  // Drop a short lead-in like "Here is the corrected text:".
  const first = t.split("\n")[0] ?? "";
  if (first.length < 80 && /:\s*$/.test(first) && /correct|text|here/i.test(first)) t = t.slice(first.length).trim();
  t = t.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!t) return null;
  const ratio = wordCount(t) / Math.max(1, wordCount(original));
  if (ratio < 0.85 || ratio > 1.1) return null;
  if (letterSimilarity(original, t) < 0.85) return null;
  return t;
}
