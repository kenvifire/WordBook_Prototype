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

export function detectLanguage(text: string): string {
  const code = franc(text);
  return LANGUAGE_NAMES[code] ?? 'unknown';
}
