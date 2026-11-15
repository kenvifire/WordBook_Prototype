# Prompt: Build a Standalone Web App (WordBook Concept)

Paste this whole document into a fresh Claude Code session to build a
**brand new, standalone web app**. Every decision needed to start
building is made below — **do not ask the user clarifying questions,
do not run a brainstorming step, go straight to planning and building.**
If something genuinely ambiguous comes up that isn't covered here, make
the most reasonable call yourself, note it in the README, and keep
going.

**Hard constraint: build this from scratch.** Do not reuse any code,
package, data model, backend project, or infrastructure from any other
existing app. New repository, new everything.

## The product

A web app for reading books in a foreign language while building
vocabulary, using a "practice before you unlock" reading flow:

1. User adds a book by pasting/uploading plain text, or uploading an
   EPUB file.
2. The book's text is split into **sections of 150 words each** (last
   section may be shorter). Section N covers word-index
   `[(N-1)*150, N*150)` of the flattened book text.
3. For each section, extract **vocabulary candidates**: tokenize the
   section's text, lowercase, strip punctuation, dedupe, then drop any
   word that appears in a bundled list of the 1000 most common English
   words (ship this list as a static JSON asset — it's the stopword/
   frequency filter that keeps "the", "is", "and" etc. out of the
   vocabulary list). Whatever's left is that section's vocabulary.
4. For each vocabulary word, fetch a definition from the free
   `https://api.dictionaryapi.dev/api/v2/entries/en/<word>` endpoint
   (no API key required) and store it. If the lookup fails (word not
   found), store the word with a null definition rather than failing
   the whole section — the user can still practice/see it blank.
5. **Section 1 starts unlocked for practice.** A section must be
   practiced before it can be read:
   - Practice is flashcard review of that section's vocabulary words:
     show the word, let the user reveal the definition, then
     self-rate **Again / Hard / Good / Easy** (standard SM-2-style
     buttons).
   - Apply a simplified SM-2 update per word per rating:
     - Again: `repetitions = 0`, `interval = 1 day`, `easeFactor =
       max(1.3, easeFactor - 0.2)`
     - Hard: `repetitions += 1`, `interval = round(interval * 1.2)`,
       `easeFactor = max(1.3, easeFactor - 0.15)`
     - Good: `repetitions += 1`, `interval = round(interval *
       easeFactor)`, `easeFactor` unchanged
     - Easy: `repetitions += 1`, `interval = round(interval *
       easeFactor * 1.3)`, `easeFactor += 0.15`
     - New word defaults: `repetitions = 0`, `interval = 1`,
       `easeFactor = 2.5`. `nextReviewDate = today + interval days`.
   - Track a per-section **recognition rate** = (words rated Good or
     Easy on their most recent review within this section) / (total
     words in section).
   - Once recognition rate ≥ **80%**, the section unlocks for reading
     and the *next* section unlocks for practice.
6. **Reading a section**: show its plain text, 150 words at a time,
   with simple prev/next navigation. Clicking/tapping any word opens a
   small popup with its definition (fetch on demand via the same
   dictionary API if not already stored) and an "add to my vocabulary"
   action that inserts it into the SRS queue (same SM-2 defaults as
   above) even if it wasn't one of the section's auto-extracted words.
7. **Global review page**: lists all of the user's words across all
   books where `nextReviewDate <= today`, in the same flashcard UI as
   section practice, updating the same SM-2 fields.
8. **Pronunciation**: on the practice and reading screens, a speaker
   icon next to each word uses the browser's built-in
   `window.speechSynthesis` API (`SpeechSynthesisUtterance`) to read it
   aloud. No external TTS service, no API key, works offline once the
   page is loaded.

## Decisions already made (build these, don't ask)

- **Stack**: Next.js (App Router, TypeScript) for frontend + API
  routes, deployed on Vercel. **Supabase** for Postgres database, auth,
  and file storage (EPUB uploads) — one service instead of three, free
  tier is enough to start.
- **Auth**: Supabase Auth, email + password only for v1 (magic link is
  a fine stretch add, not required). No social login for v1.
- **Styling**: Tailwind CSS. No specific design system — keep it clean
  and readable; a serif font for the book-reading view is a nice touch
  but not required.
- **Monetization**: none. Free, no payment integration, no usage caps.
- **Languages**: v1 is English-content books only (the dictionary API
  above is English-only). Don't build translation/other-language
  support now — note it as a clear v2 extension point in the README
  instead of building it.
- **Book formats**: plain text (paste or `.txt` upload) and `.epub`
  (parse with the `epubjs` or `epub2` npm package — pick whichever
  integrates more easily server-side in a Next.js API route). No PDF.
- **Section size**: fixed at 150 words. Not user-configurable in v1.
- **Unlock threshold**: fixed at 80% recognition rate. Not
  user-configurable in v1.

## Data model (Postgres via Supabase, one row owner = `auth.users.id`)

- `books`: id, user_id, title, author (nullable), format (`text` |
  `epub`), raw_text (full flattened text content), created_at
- `sections`: id, book_id, section_number, start_word_index,
  end_word_index, status (`locked` | `ready_to_practice` |
  `ready_to_read` | `completed`)
- `words`: id, user_id, word, definition (nullable), book_id (nullable
  — null means added via lookup outside any section-extraction flow),
  repetitions, ease_factor, interval_days, next_review_date, last_rating,
  created_at
- Unique constraint on `(user_id, word)` — a word is tracked once per
  user regardless of how many books/sections reference it; re-extracting
  the same word in a new book just reuses the existing row.

## Pages/routes

- `/signup`, `/login`
- `/library` — list of the user's books, "add a book" form
- `/book/[id]` — section list with status badges
- `/book/[id]/practice/[sectionNumber]` — flashcard practice for that
  section's due/new words
- `/book/[id]/read/[sectionNumber]` — the reader, only reachable once
  that section's status is `ready_to_read` or `completed`
- `/review` — global due-word flashcard review across all books
- `/settings` — just account/sign-out for v1

## Explicitly out of scope for v1

PDF support, non-English content, translation, payments, social login,
mobile app/offline support, configurable section size or unlock
threshold, admin/analytics dashboards, cloud TTS. Note all of these as
future extension points in the README rather than stubbing them out in
code.

## What to do with this document

Go straight to: set up the repo and stack above, create the DB schema,
then build end-to-end vertical slices in this order: auth → add a book
→ section splitting + vocabulary extraction → practice/SRS flow →
section unlock → reader with word lookup → global review page. Write a
short README documenting what was built and the v2 extension points
listed above.
