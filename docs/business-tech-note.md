# WordBook — Business & Tech Note

**Course:** Prototyping with AI — GNAM SNOC, Kozminski University, Fall 2026
**Demo Day:** 24 November 2026 · **Final Package due:** 1 December 2026
**Prototype:** https://github.com/kenvifire/WordBook_Prototype (working code + `npm run dev`; see the 1-page runbook for how to run it)

---

## 1. Problem & Desired Business Outcome

### The problem

Learners who try to read real books — novels, memoirs, nonfiction — in a second language hit a wall of unfamiliar words almost immediately. Today they have exactly two bad options:

- **Stop and look up every unknown word** in a dictionary app or translator. This breaks reading flow sentence by sentence and kills comprehension; by the third interruption in a paragraph, the story is gone.
- **Skip the words they don't know** and keep going. They lose the thread of the plot and, within a few chapters, give up on the book entirely.

Underneath this is a second, quieter problem: the vocabulary tools available today are mismatched to the reader. Generic flashcard apps (Anki, Duolingo) teach decks built from frequency lists — words common across a language in general, not the words that *this specific book* is about to use. A learner can grind through hundreds of cards from a generic deck and still be unprepared for the next chapter, because the overlap between "what the deck taught" and "what the book needs" is mostly luck.

### Who has this problem

Two groups, both real and observable:

1. **Intermediate learners moving from graded readers to authentic material.** They already know the basics of their target language and want to read a real novel, memoir, or nonfiction book — not another textbook — but they don't have a tutor on hand to pre-teach vocabulary before each chapter, so they are on their own against the book's full vocabulary load.
2. **Returning learners rebuilding vocabulary after time away**, who want to reconnect with a language through content they are actually motivated to finish, rather than a generic course that doesn't care what they want to read.

### Current workaround and why it fails

Learners keep a dictionary app or translator open in a second window and tap out of the book every few lines, or rely on an e-reader's built-in word lookup — which explains a word once and then forgets it ever happened. Neither builds lasting recall; both are reactive, not designed to prepare the learner *before* they hit the wall. The alternative — pre-loading a generic SRS deck before reading — fixes the forgetting problem but not the mismatch problem: the deck isn't built from the book in front of them.

### Desired business outcome

**If a reader is taught exactly the vocabulary the next section of their chosen book is about to use — and only unlocks that section once they can recognize it — they read more books, finish more of the books they start, and retain more vocabulary from doing so.** The concrete, observable outcomes we want to move are:

- More sections/books completed per week than the learner's normal reading habit.
- A recognition rate at each pre-reading gate that holds or improves as the learner progresses through a book (evidence the system, not luck, is doing the work).
- Vocabulary that is still recalled days later, not just at the moment it passes the gate (evidence of real learning, not a one-time pass/fail event).

This is a product bet, not a certainty: it hasn't been validated with real learners yet (see Section 2). The working prototype described in this note is the smallest version of the idea built to test exactly that bet.

---

## 2. Customer Insight & Evidence from Tests

**Status at time of writing: no pilot has been run yet.** This section is the testing plan we will execute before the Final Package submission on 1 December 2026, and the placeholders below are where real observations, quotes, and decisions will go once the pilot has run. We are flagging this explicitly rather than presenting invented data: the rubric asks for real evidence, and we would rather show an honest, executable plan than fabricate results.

### Who we will test with

A handful (target: 4–6) of intermediate learners of Spanish, recruited from people who have expressed interest in reading authentic Spanish fiction but have not sustained a reading habit in the language. We will prioritize people in the two target segments from Section 1: at least two people moving from graded readers to real books, and at least one person returning to Spanish after a gap.

### What they will do

Each participant reads *Platero y yo* (the bundled demo book) section by section using the prototype over one week, starting from whatever chapter the seed script leaves unlocked for them. Before the pilot, we will ask each participant to describe their normal reading habit in the language (sections/books per week, if any) as a self-reported baseline — this is what "sections/books completed per week, compared with the learner's normal reading habit" (Section 4's KPI) will be measured against.

### What we will observe and record

- **Recognition rate at the pre-reading gate**, logged automatically by the prototype for every section a participant studies, across consecutive sections of the same book — to see whether it holds or improves as they progress (a thin learner would see it *decline*, not just dip once).
- **Sections completed per week** during the pilot week versus the self-reported baseline.
- **A short structured interview after the pilot week**, asking: Where did the gate feel like momentum, and where did it feel like a wall? Did you ever want to skip ahead before the gate let you? Did a flashcard's AI-stated reason ("why this word") change how you felt about studying it, or did you ignore it? Would you keep using this for a book you chose yourself?
- **Direct quotes** from that interview, recorded verbatim, with permission to use anonymized excerpts in the Final Package.

### What we will decide from it

Before running the pilot, we are committing to these decision rules so the test can actually fail:

- If recognition rate at the gate *declines* across consecutive sections for most participants, the AI prioritization step is not correctly weighing what the learner already knows, and Section 3's prompt/weighting needs rework before this is worth scaling.
- If sections/week does not improve over the self-reported baseline for most participants, the core hypothesis (teach-before-you-read beats dictionary-on-demand) is not supported by this pilot, and the product bet in Section 1 needs to be revisited, not just the prototype's UI polished.
- If the interview surfaces "the gate felt like a wall" more than "the gate felt like momentum," the 80% recognition threshold (Section 3) is probably too strict for this population and should be tuned down for a second pilot before any larger claim is made.

**[Placeholder — to be filled in after the pilot, before 1 December submission: participant count and profiles actually recruited; recognition-rate trend observed; sections/week before vs. during; 2–3 direct quotes; which decision rule(s) were triggered and what we changed in response.]**

---

## 3. Solution Concept & Way of Working

### The flow, end to end

1. **Pick a book, open the next section.** The learner sees a list of sections in their chosen book, each marked locked or unlocked.
2. **Extract candidate vocabulary** (rule-based, no AI needed here). The upcoming section's text is tokenized into sentences and words, filtered to drop function words (articles, prepositions, common pronouns — a ~150-word Spanish stopword list) and proper nouns (a token that is capitalized in every one of its occurrences in the section, never appearing lowercase, is treated as a name and dropped). What's left is a candidate list: each word, how many times it occurs, and one example sentence from the book itself.
3. **AI decides what's worth teaching.** This is the step a rule-based filter cannot do. An LLM call (OpenAI, `gpt-4o-mini`) receives the candidate list plus the words this specific learner already knows, and returns the top 12 words ranked by how worth-teaching they are for *this* learner right now — dropping anything already known, and explaining *why* each surviving word made the cut. That reason is shown on the flashcard, so the prototype's reasoning is visible, not hidden behind a polished UI.
4. **AI resolves the word's meaning in context.** A second LLM call, per word, is given the word *and its exact sentence from the book* and asked for the sense the author is actually using — not the word's most common dictionary sense, which a flat lookup would return. This produces the definition, an English translation, and an example shown on the flashcard.
5. **The learner studies the words as flashcards**, self-grading recall (Again / Hard / Good / Easy) against a spaced-repetition scheduler (the standard SM-2 algorithm). Each grade updates that word's review schedule for this learner.
6. **The recognition gate.** Once at least 80% of the section's words have been graded above "Again" at least once, the gate passes and the section unlocks. A section with no new words, or where every candidate is already known, passes automatically rather than leaving the learner stuck.
7. **Reading, with tap-to-add.** The unlocked section's text is rendered for reading. Any other word the learner doesn't recognize — one the AI step didn't surface, or a word outside this section entirely — can be tapped for an instant translation (a separate, lightweight lookup, not another AI call) and is added to the same review queue for future spaced repetition.

### Human vs. tool roles, stated plainly

| Step | Who does it | Why |
|---|---|---|
| Choosing the book, the pace, and whether to keep reading | Human (the learner) | Motivation and choice are the whole point of the product |
| Extracting and filtering candidate words | Rule-based code | Solved problem; no judgment needed, and it's free and instant |
| Deciding *which* words are worth teaching *this* learner | AI (LLM) | Requires weighing frequency, difficulty, and what the learner already knows — judgment a bigger stopword list can't replace |
| Resolving a word's contextual meaning | AI (LLM) | A flat dictionary lookup returns the wrong sense as often as the right one; this needs the sentence, not just the word |
| Grading their own recall honestly | Human (the learner) | Self-reported recall is the input the scheduler needs and only the learner has |
| Scheduling the next review | Rule-based code (SM-2) | A well-understood, deterministic algorithm — no judgment call benefits from an LLM here |
| Translating an arbitrary tapped word while reading | A lightweight translation API, not the LLM | Reactive, low-stakes lookups don't need the heavier reasoning step; keeps the AI budget for the part that matters |

### Inputs, outputs, and dependencies

- **Input:** a plain-text book (public-domain for this prototype — *Platero y yo*, Juan Ramón Jiménez, via Project Gutenberg) and the learner's accumulating review history.
- **Output:** a ranked, enriched word list per section; an unlocked/locked state per section; a reading view with on-demand translations.
- **External dependencies:** OpenAI's API for the two AI steps (word prioritization, context-sense definitions); MyMemory's free translation API for the tap-to-add path. Both calls have a non-throwing fallback built in — if OpenAI is unreachable mid-demo, the prototype falls back to a frequency-ranked word list instead of crashing; if MyMemory fails, it echoes the tapped word back instead of erroring out.
- **No external database.** For this single-learner prototype, all state (review schedules, known words, unlocked sections) is stored as local JSON files — a deliberate simplification explained in Section 4.

---

## 4. Impact, Economics & Risk

### North Star metric and supporting KPIs

- **North Star: sections (and books) completed per week, versus the learner's own prior habit.** This is the outcome that actually matters to the business case — a learner who reads more is a learner who stays, recommends the product, and eventually pays for more books/languages.
- **KPI 1 — Recognition rate at the pre-reading gate (80% default threshold), tracked across consecutive sections.** A leading indicator: if this declines as a learner progresses, the North Star metric will decline shortly after.
- **KPI 2 — Retention of "mastered" words after several days, not just at the gate.** A quality indicator: distinguishes a learner who is actually retaining vocabulary from one who is just clearing gates and immediately forgetting.

**Baseline and expected pilot effect:** no baseline exists yet — it will be collected as each pilot participant's self-reported reading habit before the pilot week (Section 2). Our working hypothesis, to be tested rather than assumed, is a meaningful (not marginal) increase in sections/week during the pilot relative to that baseline; we are deliberately not publishing a specific target number until the pilot's decision rules (Section 2) have actually run once, since committing to an unvalidated number here would be exactly the kind of fabricated evidence this section is trying to avoid.

### Costs

**One-off (already incurred, building this prototype):** engineering time to build and test the 16-module pipeline described in Section 3 — extraction/filtering, SRS scheduling, the AI integration with fallbacks, the gameplay API, and the UI. No paid infrastructure was needed to build it.

**Ongoing, per the current architecture:**
- **OpenAI API calls** are the only real marginal cost. Per section studied: one prioritization call (reads the whole candidate list, modest token count) plus up to 12 context-sense calls (one per taught word, small prompts). Using `gpt-4o-mini`'s per-token pricing (OpenAI's published rates at time of writing; these change and should be re-checked before any cost claim is finalized), a full section's worth of AI calls costs a small fraction of a cent — low enough that per-learner AI cost is not the binding constraint on this product at pilot scale. These calls are cached per section, so re-studying a section the learner has already seen costs nothing further.
- **MyMemory's free translation tier** covers the tap-to-add path at no cost up to its published anonymous rate limit (on the order of a few thousand words/day) — adequate for a pilot, not for a public launch, where either a paid tier or an email-identified higher-limit tier (already supported in the code) would be needed.
- **Hosting:** none required for Demo Day (runs locally via `npm run dev`); a hosted version for a shareable prototype link is a stretch goal, deployable at no cost on a free tier (e.g. Vercel) at this scale.

**Cost-to-serve ceiling, honestly stated:** the current storage layer is local JSON files per learner, chosen deliberately to keep the MVP simple and fast to build and test (see Section 3). This does not scale past a handful of pilot learners on one machine — it has no multi-user isolation, no concurrent-write safety, and no backup story. Any step beyond a small pilot requires replacing this with a real per-user datastore. We are stating this plainly rather than letting a prototype-stage shortcut be mistaken for a production-ready cost model.

### Risks and what we are doing about them

| Risk | Mitigation already in place | What's still open |
|---|---|---|
| Extraction quality varies by format and gets confused by unusual formatting (poetry, dialogue, footnotes) | Built and tested against real dialogue-heavy, lyrical prose (the demo book itself); public-domain plain text only for now | PDF support and arbitrary user-uploaded books are explicitly out of scope for this MVP |
| A bad AI-sourced definition teaches the wrong meaning before the learner reaches the page | Context-sense step validates its own output (non-empty, well-shaped) in code, not just by prompt instruction, before showing it; any failure falls back to a labeled "(definition unavailable)" rather than silently showing something wrong | Definition quality still depends on the model; not independently fact-checked against a verified dictionary |
| The recognition gate feels like a wall instead of momentum, and learners quit | 80% threshold is a tunable default, not hardcoded; an empty or fully-known section auto-passes rather than blocking | Real threshold tuning depends on pilot evidence (Section 2's third decision rule) |
| Free translation/AI quotas are a real constraint past a small pilot | Cache-then-fallback design means repeat use of the same section costs nothing further; fallback paths mean a quota hit degrades gracefully instead of crashing | Quota and cost model needs re-costing before scaling past a handful of concurrent learners |
| **GDPR / privacy:** the system could, as it scales, hold a learner's reading and vocabulary history | At this prototype stage, the system has no accounts, no email collection, and no PII at all — it is a single local learner profile stored as JSON on the machine running it | Multi-user deployment would need a real consent flow, a data-retention policy, and a lawful basis for storing per-learner vocabulary history before any EU user data is collected |
| **IP / copyright:** reproducing book text without rights to do so | The demo uses only a public-domain text (Project Gutenberg, confirmed public domain), and the app only extracts vocabulary and short example sentences from it, not the full text, outside the reading view itself | Supporting learner-chosen, copyrighted books at scale needs either a licensing arrangement with publishers or a redesign that works from vocabulary lists/APIs rather than storing full book text |

### Simple safeguards already built in

- API keys are never hardcoded or committed; `.env.local` is gitignored.
- No user accounts, no collected personal data, in the current prototype.
- All external AI/translation calls fail safely (fallback content, never a crash) rather than exposing a broken experience or leaking an error to the user.
