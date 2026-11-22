import { OWN_BOOK_SECTION_WORDS } from "@/config/learning";

export type OwnSection = { position: number; title: string; text: string };

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

// Clean text from PDF/EPUB/TXT: unify line breaks, join hyphenated line ends,
// keep blank lines as paragraph breaks.
export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/\u00ad/g, "") // soft hyphen
    .replace(/(\w)-\n(\w)/g, "$1$2")
    .replace(/[ \t\f\v\u00a0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Paragraphs are separated by a blank line. Single line breaks inside a paragraph become spaces.
export function paragraphs(text: string): string[] {
  return normalizeText(text)
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);
}

// Splits a long paragraph at sentence ends so no piece is much bigger than the target.
function splitLong(p: string, target: number): string[] {
  if (words(p) <= target * 1.5) return [p];
  const sentences = p.match(/[^.!?]+[.!?]+["'”’)\]]*\s*|[^.!?]+$/g) ?? [p];
  const out: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if (cur && words(cur) + words(s) > target) { out.push(cur.trim()); cur = ""; }
    cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  // A single giant "sentence" (no punctuation) is cut by word count.
  return out.flatMap((piece) => {
    const w = piece.split(/\s+/);
    if (w.length <= target * 1.5) return [piece];
    const chunks: string[] = [];
    for (let i = 0; i < w.length; i += target) chunks.push(w.slice(i, i + target).join(" "));
    return chunks;
  });
}

// Groups paragraphs into parts of about `target` words. Paragraphs stay whole when possible.
// A very small last part is joined to the one before it.
export function sectionize(text: string, target = OWN_BOOK_SECTION_WORDS): OwnSection[] {
  const pieces = paragraphs(text).flatMap((p) => splitLong(p, target));
  const groups: string[][] = [];
  let cur: string[] = [];
  let n = 0;
  for (const p of pieces) {
    const w = words(p);
    if (cur.length && n + w > target * 1.2) { groups.push(cur); cur = []; n = 0; }
    cur.push(p); n += w;
  }
  if (cur.length) {
    const last = groups[groups.length - 1];
    if (last && n < target * 0.3) last.push(...cur); else groups.push(cur);
  }
  return groups.map((g, i) => ({ position: i + 1, title: `Part ${i + 1}`, text: g.join("\n\n") }));
}

export const countWords = words;
