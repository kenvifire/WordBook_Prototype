// Shared normalization for a single vocabulary token, used by both
// extractVocabulary (section ingestion) and the lookup route's normalizeWord
// (tap-to-define), so the same raw word always resolves to the same `word`
// row regardless of which path produced it.

// EPUBs and pasted text commonly use curly quotes (U+2018/U+2019) instead of
// a straight apostrophe. The tokenizer regex only matches a straight `'`, so
// without this normalization a curly apostrophe breaks a contraction into
// two garbage tokens (e.g. "don't" with a curly quote -> "don" + "t").
const SMART_QUOTES = /[‘’]/g;

export function normalizeQuotes(text: string): string {
  return text.replace(SMART_QUOTES, "'");
}

// Possessive/contraction suffixes to strip once a token is otherwise clean.
// Order matters only in that each is checked independently against the end
// of the token; there's no overlap between them that would make order matter.
const CLITIC_SUFFIXES = ["n't", "'ll", "'re", "'ve", "'s", "'m", "'d"];

function stripClitic(word: string): string {
  for (const suffix of CLITIC_SUFFIXES) {
    if (word.length > suffix.length && word.endsWith(suffix)) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

// The one definition of a token character, shared by extractVocabulary and
// normalizeWord so they can never tokenize the same text differently. Letters
// (any script), combining marks (so decomposed accents like e + U+0301 stay in
// one token), and the straight apostrophe. Use with the 'u' flag.
export const TOKEN_PATTERN_SOURCE = "[\\p{L}\\p{M}']+";

// Cleans a single raw token already matched by TOKEN_PATTERN_SOURCE: lowercases it,
// strips leading/trailing quote marks (e.g. the opening/closing quote of a
// quoted sentence sticking to the first/last word), and strips a trailing
// clitic so "don't" -> "do", "John's" -> "john", "he'll" -> "he". Returns ''
// when nothing with a letter is left (e.g. a bare "'" from a quotation mark).
export function normalizeToken(raw: string): string {
  let word = normalizeQuotes(raw).toLowerCase();
  word = word.replace(/^'+/, '').replace(/'+$/, '');
  word = stripClitic(word);
  word = word.replace(/'+$/, '');
  if (!/\p{L}/u.test(word)) return '';
  return word;
}

// Normalizes a raw, possibly punctuation-surrounded word (e.g. from the
// reader's tap-to-define, which passes in a single word straight off the
// page) the same way extractVocabulary tokenizes section text.
export function normalizeWord(raw: string): string {
  const match = normalizeQuotes(raw).match(new RegExp(TOKEN_PATTERN_SOURCE, 'u'));
  return match ? normalizeToken(match[0]) : '';
}
