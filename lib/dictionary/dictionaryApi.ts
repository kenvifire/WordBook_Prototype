const DICTIONARY_BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
const TIMEOUT_MS = 5000;

export async function fetchDefinition(word: string): Promise<string | null> {
  try {
    // I6: without a timeout, one stalled request blocks whichever
    // Promise.all it's part of (and, transitively, the whole book-add flow)
    // for minutes under the runtime's default timeouts. AbortSignal.timeout
    // makes fetch reject with an AbortError once the deadline passes, which
    // is caught below the same way as any other failure — this must never
    // throw out of fetchDefinition.
    const res = await fetch(`${DICTIONARY_BASE_URL}${encodeURIComponent(word)}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const definition = data?.[0]?.meanings?.[0]?.definitions?.[0]?.definition;
    return typeof definition === 'string' ? definition : null;
  } catch {
    return null;
  }
}
