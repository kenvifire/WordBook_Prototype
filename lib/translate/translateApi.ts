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

export async function translateWord(
  word: string,
  sourceLanguage: string,
  targetLanguage: string | null
): Promise<string | null> {
  if (targetLanguage === null || targetLanguage === sourceLanguage) return null;

  const sourceCode = LANGUAGE_CODES[sourceLanguage];
  const targetCode = LANGUAGE_CODES[targetLanguage];
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
    const translatedText = data?.responseData?.translatedText;
    return typeof translatedText === 'string' ? translatedText : null;
  } catch {
    return null;
  }
}
