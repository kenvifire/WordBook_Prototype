/**
 * Demo Day seed script.
 *
 * Pre-seeds the demo learner's state before a live walkthrough:
 *   1. Marks section 0's vocabulary as already known and unlocks section 0,
 *      so the learner "arrives" having already mastered the first section.
 *   2. Pre-warms the AI cache for section 1 (the live-demo section) by
 *      calling `buildDeck` once up front, so the live demo doesn't depend
 *      on a live OpenAI call succeeding in front of judges.
 *
 * Run with: npm run seed:demo
 */
import { loadBook, DEMO_BOOK_ID } from '../lib/text/sections';
import { extractCandidates } from '../lib/text/filter';
import { markWordsKnown, unlockSection } from '../lib/store/learnerStore';
import { buildDeck } from '../lib/services/deckService';

async function main(): Promise<void> {
  const book = loadBook(DEMO_BOOK_ID);
  const section0 = book.sections[0];
  const section1 = book.sections[1];

  if (!section0 || !section1) {
    throw new Error(
      `Expected book "${DEMO_BOOK_ID}" to have at least 2 sections, found ${book.sections.length}.`
    );
  }

  // Step 1: mark section0 as already mastered.
  const candidates0 = extractCandidates(section0.text);
  markWordsKnown(candidates0.map((c) => c.token));
  unlockSection(section0.id);

  console.log(
    `Pre-mastered section "${section0.id}" (${section0.title}): marked ${candidates0.length} words known and unlocked the section.`
  );

  // Step 2: pre-warm the AI cache for the live-demo section.
  if (!process.env.OPENAI_API_KEY) {
    console.warn(
      'WARNING: OPENAI_API_KEY is not set. buildDeck() will fall back to placeholder ' +
        'content instead of real AI output, and that placeholder content will be cached — ' +
        're-run this script with a real OPENAI_API_KEY (after clearing the AI cache) before Demo Day.'
    );
  }
  console.log(
    `Warming AI cache for live-demo section "${section1.id}" (${section1.title})...`
  );
  const deck = await buildDeck(section1.id);
  const usedFallback = deck.words.some(
    (w) => w.reason.includes('AI unavailable') || w.definitionEn === '(definition unavailable)'
  );
  if (usedFallback) {
    console.warn(
      `AI cache for section "${section1.id}" was warmed with FALLBACK placeholder content ` +
        '(the AI call failed or was unavailable) — this is not real AI output.'
    );
  } else {
    console.log(
      `AI cache warmed for section "${section1.id}": built a deck of ${deck.words.length} words using real AI output.`
    );
  }

  console.log('Demo seed complete.');
  console.log(`  Pre-mastered / unlocked: ${section0.id}`);
  console.log(`  Live-demo target:        ${section1.id}`);
}

main().catch((err) => {
  console.error('Demo seed failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
