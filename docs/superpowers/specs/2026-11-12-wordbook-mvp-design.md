# WordBook MVP — Design Doc

## Context

Course project for "Prototyping with AI" (GNAM SNOC, Kozminski University, Fall 2026).
Demo Day: 24 Nov 2026 (15-min presentation + 15-min Q&A, teams of 3–4).
Final Package: 1 Dec 2026 (working prototype link + 6–8 page Business & Tech Note +
1-page runbook).

The product concept, target user, workaround, hypothesis, success metrics, smallest
testable prototype, AI rationale, and risks are all already defined in the team's
project form (reproduced in full below for traceability — this section is the
source of truth for product intent, not something decided here).

> **WordBook** — Pick any book you actually want to read, and learn exactly the
> words it will ask of you before you turn the page.
>
> **Problem:** Learners reading real books in a second language hit a wall of
> unfamiliar words immediately. Stopping to look each one up breaks reading flow;
> skipping them loses the thread. Generic flashcard decks (Anki, Duolingo) are
> built from frequency lists, not from the book in front of the learner, so
> overlap with what they actually need is mostly luck.
>
> **Target user:** Intermediate learners moving from graded readers to authentic
> material (novels, memoirs, nonfiction) without a tutor to pre-teach vocabulary,
> plus learners returning to a language after time away who want to rebuild
> vocabulary through content they're motivated to finish.
>
> **Current workaround:** A dictionary/translator app open in a second window, or
> an e-reader's built-in lookup that explains a word once and forgets it — neither
> builds lasting recall. Or a generic SRS deck pre-loaded before reading, with poor
> overlap with the actual book.
>
> **Main hypothesis:** If we give intermediate learners a reader that extracts
> vocabulary from the exact section they're about to read, teaches those words
> with spaced repetition first, and only unlocks the section once they recognize
> enough of them, they will read more consistently and retain more vocabulary —
> because the words are drawn from a book they chose, and they stop hitting the
> same unknown word with no system to catch it.
>
> **Success metrics:**
> 1. Recognition rate at the pre-reading gate (default 80% threshold), tracked
>    across consecutive sections of the same book.
> 2. Sections/books completed per week vs. the learner's normal reading habit.
> 3. Retention of "mastered" words — share still recalled correctly after several
>    days, not just at the moment they pass the gate.
>
> **Smallest prototype to test:** One language pair, one short book (TXT/EPUB),
> tested section by section: (1) extract unique words in the upcoming section,
> filter stop words and names; (2) enrich top words with a definition and
> translation; (3) learner studies those words as flashcards under an SRS
> scheduler until crossing the recognition threshold; (4) section unlocks, and
> while reading the learner can tap any other unfamiliar word to add it to the
> same review queue.
>
> **Why AI here:** Extracting and looking up words is solved and rule-based. What
> is not solved: deciding which of a section's new words are actually worth
> teaching a given learner (weighing frequency, difficulty, what they already
> know) vs. proper nouns and noise a filter alone will miss; and resolving the
> sense of a word as the author is using it in that sentence, not just its most
> common dictionary sense.
>
> **Key risks/assumptions:** Extraction quality varies by format (EPUB/TXT fine,
> PDF limited, unusual formatting confuses word boundaries). Free dictionary/
> translation APIs can return the wrong sense and teach the wrong meaning. The
> recognition gate must feel like momentum, not a wall, or learners quit before
> reaching the book. Free translation APIs are rate-limited (~1,000 words/day),
> so cost/quota matter past a small pilot. SRS parameters need tuning for this
> population, or "mastered" words won't actually be remembered.

## Intent of this document

Scope the MVP that will be demoed live on Demo Day and described in the Business &
Tech Note, and record the technical decisions needed to start building — since the
project form defines *what* and *why*, not *how it's built*.

## Goals (MVP)

- End-to-end live demo: pick a book → section split → extract & filter vocabulary →
  AI-prioritized word list with context-correct definition/translation → SRS
  flashcard study → recognition gate (≥80%) → section unlocks → reading view →
  tap any word to add it to the review queue.
- One language pair (Spanish → English) and one short public-domain book, usable
  live, not just in a recorded video.
- The AI step must be visibly doing real work the judges can see: picking which
  words matter for *this* learner and resolving word sense from the sentence —
  not a static dictionary dump behind a nice UI. This directly maps to the
  "Evidence & Decision Logic" (10 pts) and "Customer Insight & Evidence from
  Tests" (15 pts) rubric lines.
- Instrument the three success metrics from the project form (even if real
  multi-day usage data isn't available by Demo Day, the mechanism must exist and
  be shown).

## Non-goals (MVP)

- Multiple language pairs, book upload robustness beyond plain TXT, EPUB parsing
  (nice-to-have only), PDF support (explicitly a known limitation already).
- Multi-user accounts/auth — single local learner session is enough.
- Production-grade, paid translation/dictionary infrastructure — free/rate-limited
  APIs are acceptable and already named as a known risk in the project form.
- Native mobile app — a responsive web app is sufficient for a 15-minute demo.

## Anti-goals

- A polished UI that hides the fact the AI step isn't doing anything beyond a
  dictionary call. The prototype must show its reasoning (why these words, why
  this sense) on screen, not just produce a flashcard.

## Decisions made this session (stated explicitly so they can be corrected)

- **Stack:** Next.js (App Router) + TypeScript, single app, Next API routes as
  the backend. User's explicit choice over Streamlit or a CLI script, to support
  a live, visual 15-minute demo.
- **Demo language pair:** Spanish → English, hardcoded for the MVP (user
  confirmed "Spanish" for the demo; English as the explanation language is my
  call, since the team and course are English-medium).
- **Demo book:** *Platero y yo* (Juan Ramón Jiménez) — public domain, short
  lyrical chapters (~1–2 pages each), good for demonstrating per-section gating
  live without the demo dragging. My call — the user delegated book choice.
  Sourced as plain text from a public-domain source and bundled in the repo.
- **Translation API:** MyMemory Translation API — free, keyless, workable quota
  for a demo. User confirmed "free, no-signup APIs."
- **The AI step (core differentiator):** an LLM call does two things: (a) ranks
  a section's extracted candidate words by what's worth teaching this learner
  (frequency, difficulty, already-known words), filtering proper nouns/noise;
  (b) given a word + its sentence, returns a short context-correct
  definition/translation + example, instead of a flat dictionary lookup. User
  confirmed using an OpenAI API key for this (`OPENAI_API_KEY`, model choice
  left to the builder — defaulting to a small/cheap model such as
  `gpt-4o-mini` to control cost under repeated demo runs). The user will supply
  the key via a local `.env.local` (gitignored), not pasted into chat.
- **SRS algorithm:** SM-2 — standard, well-documented, easy to justify in the
  Tech Note's "Solution Concept & Way of Working" section.
- **Persistence:** local JSON file or SQLite, no external DB — single-learner
  demo scope.
- **Deployment:** runs locally (`npm run dev`) for the live Demo Day
  presentation. Deploying to Vercel for a shareable prototype link (needed for
  the Final Package checklist) is a stretch goal, not required for Demo Day
  itself.

## Decisions from the builder-check pass

A fresh-eyes review of this doc surfaced four places a wrong guess would change
the plan. Resolutions:

- **MyMemory vs. the LLM step (my call):** these don't overlap. MyMemory covers
  only the tap-to-add-while-reading path (quick gloss on an arbitrary word the
  learner taps mid-read, reactive, lower stakes). The LLM step exclusively
  produces definitions/examples for the pre-gate candidate word list, where the
  "AI is visibly doing real work" goal actually matters for grading.
- **Demo-day reliability (my call):** pre-compute and cache AI/API responses for
  the specific demo book sections used on Demo Day, as a safety net against
  wifi/API flakiness during the graded 15-minute slot. Falls back to live calls
  for anything not pre-cached (e.g. tap-to-add on an unplanned word).
- **Starting knowledge baseline (user decision):** the live demo pre-seeds a
  learning history offstage (learner already mastered an earlier section's
  words) and demoes section 2+ live, so the AI's "what they already know"
  factor is visibly doing something when judges are watching — not a no-op on
  a cold-start learner. Needs a seed script/fixture that sets this state before
  the demo starts.
- **Demo depth (user decision):** the live walkthrough shows one full section
  cycle (extract → prioritize → study → gate → unlock → read → tap-to-add),
  not a multi-section trend. The three success metrics (recognition rate,
  sections/week, SRS retention) are presented as a separate small pilot-data
  view — "data from testing with a few learners" — not something built live
  on stage. This still needs a metrics view with a small seeded/sample dataset,
  but not real-time multi-section state changes during the demo.

## What's left to the builder (next: implementation plan)

- Exact word-extraction/filtering pipeline for Spanish (tokenization, stopword
  list, proper-noun/name filtering, frequency source).
- Exact SRS parameters and recognition-gate calculation (how "80% recognized"
  is computed from flashcard review results).
- Exact prompt(s) for the LLM word-prioritization step and the context-sense/
  definition step, plus how "what the learner already knows" is tracked and
  fed back into prioritization.
- UI layout: book/section picker, flashcard study view, gate screen, reading
  view with tap-to-add-word interaction, and a simple metrics view for the
  three success metrics.
- Content for the Business & Tech Note and 1-page runbook (separate task,
  running in parallel with the build per the user's choice), mapped to the
  rubric's four 15-point sections.
