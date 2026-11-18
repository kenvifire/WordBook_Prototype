const MYMEMORY_BASE_URL = 'https://api.mymemory.translated.net/get';
const TIMEOUT_MS = 5000;

// Language-name strings (this app's canonical form, see lib/text/detectLanguage.ts)
// -> ISO 639-1 codes, for building MyMemory's `langpair` query param. Deliberately
// small, the mirror image of detectLanguage.ts's table; extending it later is a
// one-line addition.
const LANGUAGE_CODES: Record<string, string> = {
  english: 'en',
  spanish: 'es',
  french: 'fr',
  german: 'de',
  russian: 'ru',
};

// Fix 3: a user's free-text `nativeLanguage` (Settings, deliberately NOT
// format-restricted) can be saved as "Spanish" vs "spanish" vs " Spanish ".
// Normalizing both language args the same way (trim + lowercase) before
// the same-language short-circuit and the table lookups means a casing/
// whitespace difference alone never silently breaks translation.
function normalizeLanguage(language: string): string {
  return language.trim().toLowerCase();
}

// Fix 1: MyMemory reports a quota-exhausted or unsupported-language-pair
// condition as HTTP 200 with a `responseStatus` of 429/403 *inside* the JSON
// body, and stuffs a human-readable warning string (e.g. "MYMEMORY WARNING:
// YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY...") into
// `responseData.translatedText` itself — the exact same field a real
// translation comes back in. Without this check, that warning text would be
// returned as if it were a genuine translation and then stored PERMANENTLY
// as a word's definition (this app never overwrites a non-null definition).
function isUsableTranslation(data: unknown, word: string): string | null {
  const translatedText = (data as { responseData?: { translatedText?: unknown } })?.responseData
    ?.translatedText;
  if (typeof translatedText !== 'string') return null;

  const responseStatus = Number((data as { responseStatus?: unknown })?.responseStatus);
  if (responseStatus !== 200) return null;

  if (translatedText.toLowerCase().includes('mymemory warning')) return null;

  // An unchanged echo of the input word means the translation didn't
  // actually happen (MyMemory does this for some unsupported pairs/words).
  if (translatedText.trim().toLowerCase() === word.trim().toLowerCase()) return null;

  return translatedText;
}

export async function translateWord(
  word: string,
  sourceLanguage: string,
  targetLanguage: string | null
): Promise<string | null> {
  if (targetLanguage === null) return null;

  const normalizedSource = normalizeLanguage(sourceLanguage);
  const normalizedTarget = normalizeLanguage(targetLanguage);
  if (normalizedTarget === normalizedSource) return null;

  const sourceCode = LANGUAGE_CODES[normalizedSource];
  const targetCode = LANGUAGE_CODES[normalizedTarget];
  if (!sourceCode || !targetCode) return null;

  try {
    // Same reasoning as fetchDefinition's timeout (lib/dictionary/dictionaryApi.ts):
    // without one, a stalled request blocks whichever Promise.all it's part of
    // for minutes under the runtime's default timeouts. AbortSignal.timeout makes
    // fetch reject with an AbortError once the deadline passes, caught below the
    // same way as any other failure — this must never throw out of translateWord.
    const res = await fetch(
      `${MYMEMORY_BASE_URL}?q=${encodeURIComponent(word)}&langpair=${sourceCode}|${targetCode}`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return isUsableTranslation(data, word);
  } catch {
    return null;
  }
}
