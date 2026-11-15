# WordBook v3: AI-Generated Stories, Multi-Language, Bookshelf/Practice/Statistics Redesign

## Intent and why

The current WordBook build (Firebase-backed, English-only, single global review queue, no AI integration at all) proved the core "practice vocabulary before you unlock a section" mechanic works. This next version is a substantial expansion the user wants as the next evolution of the same app: it adds a second way to get a book (AI-generates one around a topic and target vocabulary, instead of only uploading one), extends the whole pipeline to any language instead of just English, and reorganizes the app around three tabs — Bookshelf, Practice, Statistics — plus a settings surface for personal preferences (avatar, native language, theme).

This replaces the current app in place. The current build is live as the user's course Demo Day deliverable (Nov 24); the user has explicitly confirmed this redesign becomes the next version of that same deliverable, not a separate project.

## Goals

- A learner can get a book two ways: upload one, or have the app generate one around a topic, difficulty, language, and a target number of words to learn.
- The practice-before-you-unlock mechanic (now described as: practice a section's vocabulary, hit the recognition threshold, unlock it for reading) works identically for both uploaded and AI-generated books.
- The app works for any language, not just English — vocabulary extraction, definitions, and story generation are all language-agnostic.
- A learner can see, per language they're learning, how many words they've mastered and how their books are progressing.
- A learner sets a native language once, and gets word definitions in a form that leans on it (see "Definitions and native language" below).
- Repeated page loads don't re-query the same data from Firestore on every navigation.
- A learner can read a book two ways: **Section reading** (practice-to-unlock, as today) or **Free reading** (jump into any part of the text immediately, no gate) — both with the same tap-to-define and "add to vocabulary" features, confirmed by the user.

## Non-goals (not required for this version, don't build without being asked)

- Multi-device sync beyond what Firebase Auth/Firestore already give for free.
- Social or sharing features (leaderboards, following other learners, sharing a generated book).
- Payments or any monetization.
- Admin or cross-user analytics dashboards.
- Offline mode or an offline-first architecture.
- A spaced-repetition algorithm other than the existing SM-2 variant.
- Editing or regenerating an already-created AI book's text in place — making a different book is a new generation, not an edit.
- RTL layout or script-specific typography polish for the app's own UI chrome (the *content* a learner reads can be any language; the surrounding app interface itself stays as it is today).
- Languages without whitespace-separated words (Chinese, Japanese, Thai, and similar) — resolved during design review as an explicit future extension, not supported in this version. See "AI pipeline and language scope" below for why.
- OCR for scanned/image-only PDFs — confirmed by the user. PDF upload support (new in this version, see below) covers only PDFs with an extractable text layer; a scanned book with no text layer is out of scope, not silently mishandled.

## Anti-goals (would make this a failure even if it technically runs)

- A learner has to leave the app to look up what a generated story's words mean (defeats the entire point of embedding definitions and tap-to-define).
- The practice-before-read gate behaves differently between uploaded and generated books — it must be the exact same mechanic underneath, just fed different content.
- Switching tabs or revisiting a page triggers a visible reload/refetch delay every time, when the underlying data hasn't changed since the last visit (this is exactly what the caching requirement exists to prevent).
- A learner's progress data from the current live app is silently lost when this version replaces it (see "Migration" below).
- Free reading and Section reading drift out of sync — e.g. reading ahead via Free reading silently unlocking, locking, or completing a Section reading status, or vice versa. They must read and write completely independent state.

## What's being replaced vs. kept

**Kept as-is:** the overall concept (sections, SM-2 flashcards, the recognition-rate gate mechanic itself, tap-to-define while reading, Firebase Admin-SDK-only data access, session-cookie auth, Google + email/password sign-in).

**Changed:**
- The recognition threshold that gates a section (previously a fixed 80%, explicitly "not configurable" in the original spec) becomes a user-set preference instead — see "Settings" below. This is a direct reversal of that earlier decision, confirmed by the user.
- How a book gets split into sections. Today every book is auto-split into fixed 150-word sections. For **uploaded** books this is replaced by a one-time setup step (choose page-count-per-section, or let the app auto-detect chapters) — see "Book detail page" below. **AI-generated** books keep automatic fixed-size sectioning, since they're already sized by the generation inputs (target word count) and never go through this setup step.

**Added:**
- A second way to read any book — **Free reading** — alongside the existing practice-to-unlock flow (now called **Section reading** to distinguish the two). See "Book detail page" below.
- **PDF as a third upload format**, alongside `.txt` and `.epub` — confirmed by the user. Limited to PDFs with an extractable text layer; scanned/image-only PDFs are explicitly out of scope (no OCR), per "Non-goals" above.

**Replaced:**
- The rule-based, English-only vocabulary extraction (`lib/text/extractVocabulary.ts`, `commonWords.json`) and the free `dictionaryapi.dev` client (`lib/dictionary/dictionaryApi.ts`) — both are English-specific and can't serve arbitrary languages. An AI call replaces both (see "AI pipeline" below). *(This is the single biggest technical change in this version — flagging it clearly since it touches every book, not just new AI-generated ones.)*
- The global cross-book `/review` page — replaced by the per-book Practice tab, confirmed by the user. There is no merged "due words across every book" view in this version.
- The simple two-link header nav (Library/Review/Settings) — replaced by the three-tab structure plus a settings gear.
- "Library" as a concept is renamed **Bookshelf** and gains the generate-a-book path alongside upload.

**Migration:** existing data (if any exists on the live project by the time this is built) is out of scope to migrate automatically — this is a course prototype with no real users yet beyond the builder's own test accounts, so a clean cutover is acceptable. State this plainly to the person building from this doc rather than silently dropping it.

## The three tabs

### 1. Bookshelf (home/main tab)

- Shows every book the user has (uploaded or AI-generated) as a list/grid. Each entry shows at least: title, language, and a progress indicator (e.g. "3 of 7 sections unlocked").
- A persistent action (bottom of the screen, per the user's description) offers two paths:
  - **Upload a book**: the existing flow — paste text, or upload `.txt`/`.epub`/**`.pdf`** (new). A PDF with no extractable text layer (a scan with no OCR'd text) is rejected with a clear message rather than silently producing an empty book — *my call*, since the user confirmed OCR itself is out of scope. *My call:* after upload, the book's language is detected (see "AI pipeline") and shown to the user with a chance to correct it before the book is finalized, since detection on a short or unusual excerpt can be wrong and getting the language right matters for every downstream step (vocabulary, definitions).
  - **Generate a book**: a form collecting:
    - **Topic** (free text, e.g. "a mystery on a train")
    - **Difficulty level** (*my call:* three options — beginner, intermediate, advanced — rather than a numeric scale, matching how the user described "a difficulty level" singular)
    - **Target language** (explicit choice here, not detection — the AI needs to know what language to write in before it writes anything; the user's requirement list didn't name this input explicitly but it's required for generation to be possible at all)
    - **Number of words to learn** (an integer; *my call:* a reasonable range like 5–50, defaulting to something in the middle)
  - Once generated, the book appears on the shelf exactly like an uploaded one — same data shape, same practice/read flow.
- Tapping a book opens its detail view — see "Book detail page" below; this is a meaningful change from the current `/book/[id]` page, not a kept-as-is structure.

### Book detail page (opened by tapping a book on Bookshelf — not a tab)

- Shows the book's title and its language (a small badge, as mocked up).
- **First time opening an uploaded book**, before any Section reading is possible, the user picks one of two sectioning methods:
  - **By page count**: a single number input — pages per section — and the app cuts the book into equal chunks of that size.
  - **By chapter**: the app auto-detects chapter breaks in the file; one chapter becomes one section. Offered only when chapters are actually found (see "AI pipeline" below) — if none are detected, page-count is the only option shown.
  - This setup screen also offers a way to skip straight into **Free reading** without choosing a sectioning method at all — a learner who just wants to read doesn't have to configure anything.
  - **AI-generated books skip this setup screen entirely.** They're already sectioned from their generation inputs (fixed-size, per "What's being replaced vs. kept" above) and open straight into the normal view below.
- **Every open after setup** (or any open of a generated book) shows a **Free reading / Section reading** toggle, plus — under Section reading — the same section list and status badges as today (`locked` / `ready_to_practice` / `ready_to_read` / `completed`).
- **Free reading**: the full text, with the same tap-to-define and "add to vocabulary" features as Section reading, but no practice gate at all — the learner can jump into any part of the book immediately. Confirmed by the user: Free reading keeps full word features, it only drops the gate.
- **Free reading and Section reading never affect each other's state.** Reading ahead in Free reading never unlocks, completes, or otherwise changes a section's status; switching back to Section reading finds the unlock state exactly as it was left. *My call, worth calling out as an anti-goal below given how easy this would be to get wrong.*
- *My call:* Free reading reuses the exact same `sections` subcollection and per-section text slices Section reading already has — it's the same stored content, just rendered continuously and without consulting the `status` field's gate. No new text storage is needed, and this respects the existing "no `rawText` field" rule in `AGENTS.md`.
- *My call, flagged for the plan stage:* a plain `.txt`/`.epub` upload has no intrinsic concept of a "page." "Pages per section" is approximated under the hood as a fixed word-count per page (e.g. ~250 words/page) for those two formats. A **`.pdf`** upload is the exception — it has real page boundaries, so "pages per section" there uses the PDF's own pages directly, no approximation needed. Either way the user only ever sees and enters "pages," never a raw word count.

### 2. Practice tab

- Lists every book the user has, each with a single **Practice** button.
- *My call on what "Practice" does, since the user's description ("practice btn to start") left the exact scope open:* pressing it for a book starts one combined session covering (a) any of that book's words that are due for spaced-repetition review today (words from sections already unlocked, previously rated), plus (b) if the next section is still locked, that section's full vocabulary set (the existing practice-to-unlock mechanic). This is the single entry point for "work on this book's words" — it replaces both the old standalone `/book/[id]/practice/[n]` deep link as the *primary* way in (the book detail page may still deep-link into a specific section's practice view directly, for someone who navigates that way instead) and the old global `/review` page (confirmed removed).
- No cross-book merged view, per the user's decision.

### 3. Statistics tab

- Organized by language. For each language the user has any book or word in, show:
  - Number of words mastered in that language (*my call on "mastered":* a word whose most recent rating was "good" or "easy" — the same signal the existing per-section recognition gate already uses, just counted globally per language instead of per section).
  - Number of books in that language, with a per-book progress line (e.g. "sections completed: 4 of 6") under that language's section.

### Settings (gear icon, not a tab)

- **Avatar**: upload an image; *my call:* stored in Firebase Storage under a path scoped to the user's uid, with the resulting URL saved to the user's profile.
- **Native language**: a single stored preference. *My call on how it's used, since the user didn't say:* it drives how word definitions are shown (see next section) — this is the most natural reading of "native language" in a vocabulary-learning app, but it's a guess, not something the user stated outright.
- **Theme**: light/dark (*my call:* plus a "system" option that follows the OS preference, since that's the common third choice and nearly free to add).
- **Recognition threshold**: the percentage of a section's words a learner must recognize to unlock it for reading — previously fixed at 80% and explicitly non-configurable; now a user-set preference, confirmed by the user. *My call on the mechanics, since the user didn't specify bounds or scope:* a single global setting (applies to every book and section, not set per-book), stored as a percentage, defaulting to 80% until changed, with a sensible allowed range (e.g. 50%–100%) so the gate can't be set to something that defeats its own purpose (0%) or becomes needlessly punishing to configure accidentally. Changing it only affects sections not yet unlocked — a section already unlocked under the old threshold stays unlocked.
- Sign-out stays here too (already exists).

## AI pipeline and language scope (resolved after the design review)

**Language scope for this version:** whitespace-delimited languages only (English, Spanish, French, German, Russian, and similar — anything where "words" are separated by spaces). Languages without word-separating spaces (Chinese, Japanese, Thai, etc.) are an explicit, named future extension, not silently broken — the current section-sizing ("150 words," counted by splitting on whitespace) and the reader's tap-to-define (same whitespace split) both depend on this, and extending to scriptio-continua languages would require the pipeline to return actual word-boundary data for the reader to use instead of splitting on spaces itself. Out of scope here.

**Only story generation uses a paid LLM (DeepSeek, user-supplied key).** Nothing else needs one:

1. **Story generation** (DeepSeek): given topic, difficulty, target language, and target word count, produce a story long enough to be split into multiple 150-word sections (the existing fixed section size is kept for **generated books only** — *my call*, since the user didn't ask to change it; uploaded books instead use the user-chosen page/chapter sectioning described in "Book detail page" above), written so the target vocabulary appears naturally across those sections. The generation call also returns the exact target word list it used — this becomes that book's vocabulary directly, no separate extraction step needed for generated books.
2. **PDF text extraction** (free, no AI) — uploaded `.pdf` books only, runs before every other step below: a free PDF-parsing library (e.g. `pdf-parse` or `pdfjs-dist`) pulls the text layer out of the PDF, plus its outline/bookmarks when present (fed into chapter detection, item 6). A PDF with no extractable text layer is rejected at upload time rather than silently producing an empty book, per the OCR non-goal above.
3. **Vocabulary extraction** (free, no AI) — *uploaded books only, since generated books already have their word list from generation*: extends the existing stopword-filtering approach (`lib/text/extractVocabulary.ts`'s current English-only common-words list) to any whitespace-delimited language using a free, open-source multi-language stopword list (e.g. covering the same handful of dozens of languages a package like `stopwords-iso` ships). Tokenization stays whitespace/regex-based, per the language-scope decision above.
4. **Definitions** (free, no AI, translation-based) — for every book, generated or uploaded: each target word is translated into the user's native-language setting via a free translation API, the same approach (and likely the same kind of provider, e.g. MyMemory) used in this app's very first prototype version for Spanish→English. This is a translation gloss, not a full dictionary definition — simpler, free, and works for any language pair the translation API covers.
5. **Language detection** (free, no AI) — uploaded books only: a lightweight algorithmic language-identification library (trigram/statistical, not an API call) run against the uploaded text, to pre-fill the language the user then confirms or corrects. Generated books don't need detection since the user explicitly chose the target language as a generation input.
6. **Chapter detection** (free, no AI) — uploaded books only, feeding the "by chapter" sectioning option on the Book detail page's first-open setup: a heading-pattern heuristic (e.g. `Chapter \d+`, `CHAPTER ONE`) for `.txt`, the EPUB's own table of contents/spine for `.epub`, and the PDF's own outline/bookmarks (extracted in item 2) for `.pdf`, falling back to the same heading-pattern heuristic as `.txt` when a PDF has no outline — never an API call. If nothing is found, the "by chapter" option simply isn't offered and page-count sectioning is the only choice.

**Left to the builder:** the exact DeepSeek model, the exact free translation API and language-detection library to use, and the specific multi-language stopword-list package — these are implementation choices within the free/paid split above, not open product questions.

**My call, added after builder review, finalized now that language scope is resolved to whitespace-delimited languages:** whatever the extraction step returns as a word's canonical form is exactly what the lookup route must reuse to build that word's deterministic document ID. The two must never compute this independently — if tap-to-define's lookup route normalizes a word even slightly differently than extraction did, it creates a second, unrelated word document instead of matching the one extraction already made, which silently breaks that word's recognition-rate tracking (this exact bug class is already called out as a sharp edge in `AGENTS.md`). Since scope is whitespace-delimited languages, `lib/text/normalizeWord.ts`'s current approach (lowercase, strip punctuation, strip clitics) needs to become diacritic-aware rather than Latin-only (today's `/[a-zA-Z']+/`-style regex would mangle "café" or "mañana"), but stays a straightforward per-token normalization, not a per-language special case — both extraction and lookup must call the exact same normalization function.

## Data model implications (high-level — the plan stage works out the exact Firestore shape)

- `books` gains: `language`, `source` (`'uploaded' | 'ai_generated'`), and for generated books, the generation inputs (`topic`, `difficultyLevel`, `targetWordCount`) kept for reference.
- `books`'s existing `format` field (`'text' | 'epub'` today, per `AGENTS.md`) gains a third value, `'pdf'`.
- `books` also gains a `sectioningMethod` (`'fixed_word_count'` for generated books, `'by_page'` or `'by_chapter'` for uploaded books) and, for `'by_page'`, the chosen `pagesPerSection`. An uploaded book has no sections at all until this is set on first open — the Bookshelf's progress indicator for such a book shows "not yet started" rather than a section count.
- `words` becomes language-scoped, not just user-scoped: the existing deterministic-ID scheme (`${userId}_${word}`) needs the language folded in (e.g. `${userId}_${language}_${word}`), since the same spelling can be a different word in a different language, and a user may be learning more than one language at once. *Flagging this clearly:* this touches the existing uid-prefix security rule and every place that builds or parses a word's document ID — it's a real, non-trivial ripple through the current codebase's data-access rule described in `AGENTS.md`, not a cosmetic addition.
- A new `users/{uid}` profile document is needed (doesn't exist today) to hold `nativeLanguage`, `avatarUrl`, `theme`, and `recognitionThreshold`. *My call, added after builder review:* every existing account has no such document yet, and nothing backfills one. A user with no `nativeLanguage` set gets a plain monolingual definition (no translation) until they visit Settings, plus a one-time, non-blocking prompt somewhere on Bookshelf suggesting they set it — this never blocks reading, generating, or practicing. A user with no `recognitionThreshold` set yet uses the 80% default (same resolution pattern — missing profile fields fall back to sensible defaults, nothing blocks on the profile doc existing).
- **Recognition-rate gate becomes a per-user value, not a constant.** `lib/sections/sectionService.ts`'s unlock check currently compares the computed recognition rate against a hardcoded `0.8`; it now needs to read the acting user's `recognitionThreshold` (falling back to 80% if unset) instead. This touches the one place in the codebase that currently hardcodes the threshold.
- **Rollout sequencing for the word-ID change, added after builder review:** `AGENTS.md` and `.github/workflows/deploy.yml` establish that application code auto-deploys to the live app on every push to `main`, but `firestore.rules` is deployed manually, separately. Switching the word-ID scheme (`${userId}_${word}` → `${userId}_${language}_${word}`) therefore can't just "update the rule in the same change" — the rule and the code would go live at different moments on the actual Demo Day system. The safe order: (1) manually deploy an updated `firestore.rules` whose `words` create-rule accepts *either* ID shape (a temporary overlap), confirm it's live; (2) merge and let CI deploy the application code that starts writing the new scheme; (3) once no code is writing the old scheme anymore, tighten the rule back down to only the new shape in a follow-up change. The plan should spell out these as three distinct steps, not one.
- Statistics are computed from existing `books`/`sections`/`words` data grouped by language, rather than a separately maintained counter document. *My call, for simplicity:* if this becomes slow at real scale, a denormalized per-language counter is the natural next step, but isn't needed to ship this version.

## Caching (the user's "2-level cache" requirement)

*My call on what the two levels are, since the user named the requirement but not the mechanism:*

- **Client-side (browser) cache**: data already fetched during the current session (book list, a book's sections, a book's words) is kept in memory on the client and reused when navigating between tabs/pages, instead of refetching every time a page mounts. Invalidated by the specific action that changes it (rating a word, unlocking a section, adding/generating a book).
- **Server-side (in-process) cache**: since this app runs as one long-lived Node process (via `systemd`, not serverless functions), a short-TTL in-memory cache on the server absorbs bursts of repeated reads for the same data (e.g. several components on one page all asking for the same book) without hitting Firestore each time. Invalidated on writes to the same key within that process.

**My call, refined after builder review:** this does not require rewriting the existing Server-Component page convention into client-fetched pages with a client data-fetching library. `AGENTS.md` establishes that pages are Server Components calling the Admin SDK directly, and that convention is kept: the server-side cache above wraps those same Admin SDK calls — a Server Component checks the cache before hitting Firestore, exactly as it does today, just memoized for a short TTL. The client-side cache covers only pieces that are already client components today (the practice session, the lookup/rate flows) plus Next.js's own built-in route prefetching between the three tabs. No page that is a Server Component today needs to become a client-fetched one to satisfy this requirement.

## Out of scope for this document

Exact AI prompts, exact Firestore schema and security-rule text, exact UI component breakdown, exact caching key/TTL values, and the AI provider choice are all plan-stage decisions, not requirements-stage ones — they belong in the implementation plan, not here.
