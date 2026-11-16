// Chapter-break detection for the "sectioned by chapter" sectioning mode.
//
// Both functions return word-index positions (0-based), matching the same
// whitespace-splitting convention `sectionize.ts` uses to lay out sections
// (`text.trim().split(/\s+/).filter(w => w.length > 0)`), so a caller can
// slice chapters directly against that word array.

const SPELLED_OUT_NUMBERS = [
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
  'Twenty',
];

const NUMERIC_HEADING_REGEX = /\b(Chapter|CHAPTER)\s+\d+\b/g;
const SPELLED_HEADING_REGEX = new RegExp(
  `\\b(Chapter|CHAPTER)\\s+(${SPELLED_OUT_NUMBERS.join('|')})\\b`,
  'gi'
);

/** Converts a character offset in `text` to a word-index (0-based). */
function charIndexToWordIndex(text: string, charIndex: number): number {
  const before = text.slice(0, charIndex).trim();
  if (before.length === 0) return 0;
  return before.split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Scans raw text for "Chapter N" / "Chapter One" style headings and returns
 * the word-index position of each one, in order. Requires at least 2
 * headings to be worth offering "by chapter" sectioning — a single
 * "chapter" mention is probably not a real structural marker.
 */
export function detectChapterBreaksByHeading(text: string): number[] | null {
  const charIndices = new Set<number>();

  for (const match of text.matchAll(NUMERIC_HEADING_REGEX)) {
    if (match.index !== undefined) charIndices.add(match.index);
  }
  for (const match of text.matchAll(SPELLED_HEADING_REGEX)) {
    if (match.index !== undefined) charIndices.add(match.index);
  }

  if (charIndices.size < 2) return null;

  const sortedCharIndices = Array.from(charIndices).sort((a, b) => a - b);
  return sortedCharIndices.map((charIndex) => charIndexToWordIndex(text, charIndex));
}

/**
 * For epub/pdf sources that come with a known table of contents / outline:
 * locates each chapter title's first occurrence in the flattened full text
 * and converts its character offset to a word-index position. Titles that
 * can't be located are dropped. Returns null if fewer than 2 titles resolve.
 */
export function detectChapterBreaksFromTitles(
  fullText: string,
  chapterTitles: string[]
): number[] | null {
  const wordIndices: number[] = [];

  for (const title of chapterTitles) {
    const charIndex = fullText.indexOf(title);
    if (charIndex === -1) continue;
    wordIndices.push(charIndexToWordIndex(fullText, charIndex));
  }

  if (wordIndices.length < 2) return null;

  return wordIndices;
}
