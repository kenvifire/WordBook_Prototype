export interface TranslationResult {
  translatedText: string;
}

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';

/**
 * Translates a single word via the free MyMemory API.
 *
 * Never throws: on network failure, a non-ok response, or a malformed body it
 * echoes the original word back so the tap-to-add flow keeps working when
 * MyMemory is down or rate-limited.
 */
export async function translateWord(
  word: string,
  opts?: { from?: string; to?: string },
): Promise<TranslationResult> {
  const from = opts?.from ?? 'es';
  const to = opts?.to ?? 'en';

  let url =
    `${MYMEMORY_URL}?q=${encodeURIComponent(word)}` +
    `&langpair=${encodeURIComponent(`${from}|${to}`)}`;
  const email = process.env.MYMEMORY_EMAIL;
  if (email) {
    url += `&de=${encodeURIComponent(email)}`;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { translatedText: word };
    }
    const body = (await response.json()) as {
      responseData?: { translatedText?: unknown };
    };
    const translated = body?.responseData?.translatedText;
    if (typeof translated !== 'string' || translated.trim() === '') {
      return { translatedText: word };
    }
    return { translatedText: translated };
  } catch {
    return { translatedText: word };
  }
}
