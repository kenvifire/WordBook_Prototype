import { franc } from 'franc';

// ISO 639-3 codes -> this app's language-name strings. Deliberately small;
// extending it later is a one-line addition.
const LANGUAGE_NAMES: Record<string, string> = {
  eng: 'english',
  spa: 'spanish',
  fra: 'french',
  deu: 'german',
  rus: 'russian',
};

// Restricting franc to the in-scope languages is required: unrestricted,
// franc classifies short English/Spanish sentences as Scots ('sco') and
// Romansh ('rmn') respectively.
const CANDIDATES = Object.keys(LANGUAGE_NAMES);

export function detectLanguage(text: string): string {
  const code = franc(text, { only: CANDIDATES });
  return LANGUAGE_NAMES[code] ?? 'unknown';
}
