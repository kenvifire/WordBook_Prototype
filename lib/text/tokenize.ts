// Spanish-aware text helpers. Pure functions over plain strings.

// A word is a run of letters (any script, incl. á é í ó ú ñ ü), optionally
// containing apostrophes or hyphens after the first letter. Leading dashes
// (dialogue "—") and surrounding punctuation are never matched.
const WORD_RE = /\p{L}[\p{L}'-]*/gu;

// Split after sentence-ending punctuation followed by whitespace, or before
// whitespace that precedes a dialogue dash ("—").
const SENTENCE_BOUNDARY_RE = /(?<=[.!?])\s+|\s+(?=—)/u;

export function splitSentences(text: string): string[] {
  return text
    .split(SENTENCE_BOUNDARY_RE)
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 0);
}

// Preserves original casing.
export function tokenizeWords(sentence: string): string[] {
  return sentence.match(WORD_RE) ?? [];
}

// Lowercase dictionary key. JS toLowerCase handles accented letters.
export function normalizeToken(token: string): string {
  return token.toLowerCase();
}
