import { getSection } from '@/lib/text/sections';
import { extractCandidates } from '@/lib/text/filter';
import { getKnownWords } from '@/lib/store/learnerStore';
import { createCardIfMissing } from '@/lib/store/cardStore';
import { createOpenAIClient } from '@/lib/ai/client';
import { withCache } from '@/lib/ai/cache';
import { prioritizeWords } from '@/lib/ai/prioritize';
import { getContextSense } from '@/lib/ai/contextSense';
import type { WordSense, CardState } from '@/lib/types';

export interface DeckWord extends WordSense {
  reason: string;
  priorityScore: number;
  card: CardState;
}

export async function buildDeck(sectionId: string): Promise<{ sectionId: string; words: DeckWord[] }> {
  const section = getSection(sectionId);
  if (!section) {
    throw new Error(`Unknown section: ${sectionId}`);
  }

  const candidates = extractCandidates(section.text);
  const known = getKnownWords();
  const client = createOpenAIClient(process.env.OPENAI_API_KEY!, process.env.OPENAI_MODEL);

  const prioritized = await withCache(`prioritize:${sectionId}`, () =>
    prioritizeWords(client, candidates, known)
  );

  const words: DeckWord[] = [];
  for (const word of prioritized) {
    const sense = await withCache(`sense:${sectionId}:${word.token}`, () =>
      getContextSense(client, word)
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
