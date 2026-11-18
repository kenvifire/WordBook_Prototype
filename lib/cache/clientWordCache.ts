// In-memory, client-side cache for word-popup lookups. Module-level state
// only — intentionally NOT localStorage, so it never survives a full page
// reload (Global Constraints). Scoped to the current browser tab/session.
//
// `getCachedDefinition` returns `undefined` when the word has never been
// looked up this session, and `null` when it was looked up and the
// definition genuinely is null (e.g. no nativeLanguage set, or the
// dictionary/translation found nothing) — callers must treat `null` as
// "don't re-fetch, show the no-definition message," not as "not cached yet."

const cache = new Map<string, string | null>();

export function getCachedDefinition(key: string): string | null | undefined {
  return cache.get(key);
}

export function setCachedDefinition(key: string, definition: string | null): void {
  cache.set(key, definition);
}
