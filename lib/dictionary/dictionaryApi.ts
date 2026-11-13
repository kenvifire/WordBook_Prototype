const DICTIONARY_BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

export async function fetchDefinition(word: string): Promise<string | null> {
  try {
    const res = await fetch(`${DICTIONARY_BASE_URL}${encodeURIComponent(word)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const definition = data?.[0]?.meanings?.[0]?.definitions?.[0]?.definition;
    return typeof definition === 'string' ? definition : null;
  } catch {
    return null;
  }
}
