import { getSection } from '@/lib/text/sections';
import { extractCandidates } from '@/lib/text/filter';
import { getKnownWords } from '@/lib/store/learnerStore';
import { createCardIfMissing } from '@/lib/store/cardStore';
import { createOpenAIClient } from '@/lib/ai/client';
import { withCache } from '@/lib/ai/cache';
import { prioritizeWords, isPrioritizeFallback } from '@/lib/ai/prioritize';
import { getContextSense, isContextSenseFallback } from '@/lib/ai/contextSense';
import type { WordSense, CardState } from '@/lib/types';

export interface DeckWord extends WordSense {
  reason: string;
  priorityScore: number;
  card: CardState;
}

/** Thrown inside withCache's compute to carry a fallback value out without caching it. */
class FallbackNotCached<T> extends Error {
  constructor(readonly value: T) {
    super('AI call fell back to placeholder content; not caching it');
  }
}

/**
 * Like withCache, but never persists a fallback result. The AI helpers never
 * reject — they return placeholder content on failure — so withCache alone
 * would cache that placeholder forever. Throwing inside compute makes withCache
 * skip the write; the fallback value is still returned to the caller, and a
 * later call with a working key genuinely retries the AI.
 */
async function cacheUnlessFallback<T>(
  key: string,
  compute: () => Promise<T>,
  isFallback: (value: T) => boolean,
): Promise<T> {
  try {
    return await withCache(key, async () => {
      const result = await compute();
      if (isFallback(result)) {
        throw new FallbackNotCached(result);
      }
      return result;
    });
  } catch (err) {
    if (err instanceof FallbackNotCached) {
      return err.value as T;
    }
    throw err;
  }
}

export async function buildDeck(sectionId: string): Promise<{ sectionId: string; words: DeckWord[] }> {
  const section = getSection(sectionId);
  if (!section) {
    throw new Error(`Unknown section: ${sectionId}`);
  }

  const candidates = extractCandidates(section.text);
  const known = getKnownWords();
  const client = createOpenAIClient(process.env.OPENAI_API_KEY!, process.env.OPENAI_MODEL, process.env.OPENAI_BASE_URL);

  const prioritized = await cacheUnlessFallback(
    `prioritize:${sectionId}`,
    () => prioritizeWords(client, candidates, known),
    isPrioritizeFallback,
  );

  const words: DeckWord[] = [];
  for (const word of prioritized) {
    const sense = await cacheUnlessFallback(
      `sense:${sectionId}:${word.token}`,
      () => getContextSense(client, word),
      isContextSenseFallback,
    );
    const card = createCardIfMissing(sectionId, word.token);
    words.push({
      ...sense,
      reason: word.reason,
      priorityScore: word.priorityScore,
      card,
    });
  }

  return { sectionId, words };
}
