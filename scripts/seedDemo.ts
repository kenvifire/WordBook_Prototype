/**
 * Demo Day seed script.
 *
 * Pre-seeds the demo learner's state before a live walkthrough:
 *   0. Resets learner/card/review state (learner.json, cards.json,
 *      reviews.json) so a rehearsal doesn't leak into Demo Day. The AI cache
 *      (ai-cache/) is deliberately kept so pre-warmed output survives.
 *   1. Marks section 0's vocabulary as already known and unlocks section 0,
 *      so the learner "arrives" having already mastered the first section.
 *   2. Pre-warms the AI cache for section 1 (the live-demo section) by
 *      calling `buildDeck` once up front, so the live demo doesn't depend
 *      on a live OpenAI call succeeding in front of judges.
 *
 * Run with: npm run seed:demo
 * Reads .env.local (if present) for OPENAI_API_KEY etc.; tsx doesn't load it
 * automatically the way `next dev` does. Variables already set in the shell win.
 */
import fs from 'node:fs';
import { loadBook, DEMO_BOOK_ID } from '../lib/text/sections';
import { extractCandidates } from '../lib/text/filter';
import { markWordsKnown, unlockSection } from '../lib/store/learnerStore';
import { dataPath } from '../lib/store/jsonStore';
import { buildDeck } from '../lib/services/deckService';
import { isPrioritizeFallback } from '../lib/ai/prioritize';
import { isContextSenseFallback } from '../lib/ai/contextSense';

if (fs.existsSync('.env.local')) {
  process.loadEnvFile('.env.local');
}

// Learner progress files that a rehearsal mutates. ai-cache/ is intentionally
// NOT listed: the whole point of pre-warming it is to survive rehearsals.
const RESETTABLE_STATE_FILES = ['learner.json', 'cards.json', 'reviews.json'];

function resetLearnerState(): void {
  for (const file of RESETTABLE_STATE_FILES) {
    const filePath = dataPath(file);
    if (fs.existsSync(filePath)) {
      fs.rmSync(filePath);
      console.log(`Reset: deleted ${filePath}`);
    } else {
      console.log(`Reset: ${filePath} not present (already clean)`);
    }
  }
  console.log(`Reset: kept AI cache at ${dataPath('ai-cache')} untouched.`);
}

async function main(): Promise<void> {
  const book = loadBook(DEMO_BOOK_ID);
  const section0 = book.sections[0];
  const section1 = book.sections[1];

  if (!section0 || !section1) {
    throw new Error(
      `Expected book "${DEMO_BOOK_ID}" to have at least 2 sections, found ${book.sections.length}.`
    );
  }

  // Step 0: wipe any learner/card/review state left over from a rehearsal.
  resetLearnerState();

  // Step 1: mark section0 as already mastered.
  const candidates0 = extractCandidates(section0.text);
  markWordsKnown(candidates0.map((c) => c.token));
  unlockSection(section0.id);

  console.log(
    `Pre-mastered section "${section0.id}" (${section0.title}): marked ${candidates0.length} words known and unlocked the section.`
  );

  // Step 2: pre-warm the AI cache for the live-demo section.
  // Refuse to even attempt this if there's no API key: buildDeck's AI helpers
  // catch request failures internally and fall back to placeholder content.
  // buildDeck no longer caches fallback results, but a keyless run can't warm
  // anything, so fail fast with a clear message instead.
  if (!process.env.OPENAI_API_KEY) {
    console.error(
      'ERROR: OPENAI_API_KEY is not set. Skipping step 2 (buildDeck for ' +
        `"${section1.id}") entirely — no AI call will be made and nothing will be written ` +
        'to the AI cache. Re-run this script with a real OPENAI_API_KEY set before Demo Day.'
    );
    console.log('Demo seed INCOMPLETE.');
    console.log(`  Pre-mastered / unlocked: ${section0.id}`);
    console.log(`  Live-demo target:        ${section1.id} (AI cache NOT warmed)`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `Warming AI cache for live-demo section "${section1.id}" (${section1.title})...`
  );
  const deck = await buildDeck(section1.id);
  const usedFallback =
    isPrioritizeFallback(deck.words) || deck.words.some((w) => isContextSenseFallback(w));
  if (usedFallback) {
    console.error(
      `ERROR: building the deck for section "${section1.id}" fell back to placeholder ` +
        'content (the AI call failed, e.g. invalid key, API error, or rate limit) — this is ' +
        'not real AI output, and the fallback entries were NOT cached. Fix the underlying AI ' +
        'call and re-run before Demo Day.'
    );
    console.log('Demo seed INCOMPLETE.');
    console.log(`  Pre-mastered / unlocked: ${section0.id}`);
    console.log(`  Live-demo target:        ${section1.id} (AI cache NOT fully warmed: fallback content)`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `AI cache warmed for section "${section1.id}": built a deck of ${deck.words.length} words using real AI output.`
  );
  console.log('Demo seed complete.');
  console.log(`  Pre-mastered / unlocked: ${section0.id}`);
  console.log(`  Live-demo target:        ${section1.id}`);
}

main().catch((err) => {
  console.error('Demo seed failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
