# AI Book Generation — Design

## Intent

Today the only way to get a book into WordBook is to upload one. Add a second
path: the user describes a book they want (language, level, topic, length,
how much new vocabulary) and the app generates one using an LLM (DeepSeek),
which then behaves exactly like an uploaded book — readable, with vocabulary
extraction and practice working the same way.

This exists because vocabulary-learning content that's pitched at exactly the
user's level, on a topic they chose, using words they already know plus a
controlled dose of new ones, is more useful for practice than generic
uploaded text and is hard for a user to find or write themselves.

## Goals

- A "Generate Book" option next to "Upload Book" that produces a real book
  in the user's library from: language, CEFR level, topic, target word
  count, new-word percentage.
- The DeepSeek API key is configured server-side by the app owner, the same
  way this app's existing Cloud Text-to-Speech key already is (see
  `functions/src/index.ts`'s `synthesizeSpeech`) — never entered or stored
  by the user, never shipped to the client.
- The generator uses what the user already knows in that language — derived
  from their existing per-book vocabulary, not a new tracking system — so
  "new word percentage" means something real relative to that user.
- A generated book is indistinguishable from an uploaded one to every other
  part of the app (reading, tap-to-lookup, practice, sections, enrichment).

## Non-goals

- Multiple LLM providers. DeepSeek only.
- A generate → validate word-count/ratio → regenerate loop. One request,
  best-effort. (Natural follow-up if results feel too far off target.)
- Editing the generated text in-app before it's saved. Regenerating (a new
  request) is the only way to get something different.
- Images, audio, or any non-text content.
- Any user-facing credential UI at all — there is no key for the user to
  enter, see, or manage.

## Anti-goals

- A generation flow so slow or opaque the user can't tell if it's working.
- A generated book that silently fails to match the requested language —
  wrong-language output must be treated as a failed generation, not saved.
- Blocking legitimate repeated generation (same topic, another attempt) on
  the existing upload flow's exact-title duplicate check.
- Unbounded cost exposure to the app owner. Unlike the original per-user-key
  design, every generation now spends the app owner's own DeepSeek budget,
  for every user — this makes a server-side usage cap a real requirement,
  not a nice-to-have (see Constraints and `synthesizeSpeech`'s
  `DAILY_CHARACTER_CAP` for the existing precedent).

## Constraints

- DeepSeek's API: `POST https://api.deepseek.com/chat/completions`, model
  `deepseek-chat`, Bearer token auth, OpenAI-compatible request/response
  shape. Called server-side only, from a new Firebase Cloud Function (e.g.
  `generateBook`), never from the client.
- The new Cloud Function follows `synthesizeSpeech`'s exact existing shape
  (`functions/src/index.ts`): `onCall`, requires `request.auth` (signed-in
  users only), strictly validates every field of the request (language
  against the app's known language codes, level against the CEFR allowlist,
  word count against the cap, topic length-capped), reads the DeepSeek key
  from server config/secret (never returned to the client), and records
  per-user-daily and monthly usage in Firestore with a hard cap — mirroring
  `ttsUsage`/`DAILY_CHARACTER_CAP` — so one misbehaving or malicious client
  can't run up an unbounded bill. Exact cap size is left to the builder, but
  must exist.
- The client still does all of the per-user, local-data work that doesn't
  belong on the server: computing the known-word sample from the user's own
  local `Word` records (see below) and building the rest of the request
  payload (language, level, topic, word count, new-word percentage), then
  calls `generateBook` via the `cloud_functions` package (already a
  dependency) instead of calling DeepSeek directly.
- CEFR levels: A1, A2, B1, B2, C1, C2.
- Generated word count is capped at 5,000 (enforced on the client form *and*
  re-validated inside the Cloud Function — never trust the client alone) to
  bound cost and latency.
- The known-word query reuses `WordRepository.getWordsByUser(userId)` —
  already implemented, works identically on native (Isar) and web
  (IndexedDB) — filtered client-side by `word.language` and `status !=
  WordStatus.newWord`. No new store method, no new schema.
- The generated text is handed to the exact same ingestion path an uploaded
  `.txt` file already goes through: `createBookFileIO().store(...)` for
  bytes, `BookService.parseBookBytes(bytes, '.txt', title)` for parsing,
  then the normal `Book` creation / vocabulary extraction / enrichment flow
  in `books_state_provider.dart`. No new parsing or practice code.

## Approaches

**Known-word tracking** — two options were considered:

1. **Derive from existing `Word` records** (chosen): no new data model;
   query the user's existing per-book words, group by language, treat
   anything past `newWord` status as known. Always consistent with each
   book's own progress (single source of truth). Cost is a query across all
   the user's words — confirmed acceptable even at several thousand words
   (an in-memory filter/group, well under a second).
2. New dedicated per-language vocabulary table, updated whenever any book's
   word reaches a known status. Cheaper to query at very large scale, opens
   the door to future per-language stats, but is a second source of truth
   that can drift from per-book progress. Rejected for now — the user
   explicitly accepted option 1's cost after confirming it's reasonable.

**Generation strategy** — two options were considered:

1. **Single request, best-effort** (chosen): one DeepSeek call with the
   known-word sample, level, topic, word count, and new-word percentage as
   instructions; whatever comes back is the book. Simple, fast, cheap.
2. Generate-then-measure-then-retry: run the real word-extraction logic
   against the draft, compare actual new-word percentage/length against the
   target, ask DeepSeek to revise if off by more than a threshold. More
   accurate, meaningfully slower and more expensive per generation.
   Explicitly deferred (see Non-goals) — worth revisiting if users find
   results too far off target.

## Design

### Flow

1. User taps "+" on the bookshelf (currently goes straight to the upload
   file picker). It now offers a choice: **Upload Book** / **Generate
   Book** (same bottom-sheet pattern `BookshelfScreen._showBookOptions`
   already uses elsewhere in this screen).
2. **Generate Book** opens a form: Language (defaults to
   `User.learningLanguage`, reuses the existing `SupportedLanguage` list),
   Level (CEFR dropdown), Topic (free text), Word count (number field,
   capped at 5000), New word percentage (slider, 0–100%).
3. On submit: the app queries the user's known words for the selected
   language (per Constraints), takes a capped random sample (a few hundred
   words — exact number left to the builder, token-budget driven), and
   calls the `generateBook` Cloud Function with the full request.
4. The response text becomes the book, via the existing ingestion path
   (Constraints). Title: built from topic + level + a timestamp (never just
   the bare topic) specifically so a second generation on the same topic
   doesn't collide with the upload flow's exact-title duplicate check.
5. Failure at any step (not signed in, server-side usage cap reached,
   DeepSeek error, empty/garbage response, network failure) shows a clear,
   specific error and does not create a book.

### Settings

None needed — there is no key for the user to configure. (This replaces the
original design's Settings section, which added a DeepSeek API key field;
removed per the server-side-proxy decision above.)

## Review Focus

- **Server-side usage cap reached**: must produce a clear, specific message
  ("generation limit reached, try again tomorrow" or similar) — never a
  generic network error or a crash — and must actually be enforced
  server-side (a client that skips the check entirely must still be
  blocked by the Cloud Function itself).
- **Zero known words yet** (a user generating their very first book in a
  language they haven't practiced at all): the known-word sample is empty;
  generation must still proceed sensibly (effectively 100% new vocabulary
  at the stated level), not error or send a malformed request.
- **Empty or garbage DeepSeek response** (including an error-shaped JSON
  body, or text that doesn't look like the requested language): treated as
  a failed generation — nothing saved to the library — not silently
  accepted as a book.
- **Word count cap**: enforced both on the form (can't type/submit a value
  over 5000) and in the actual request sent to DeepSeek — never trust the
  model to self-limit.
- **Duplicate-title collision**: two generations on the same topic must not
  collide with the upload flow's existing exact-title duplicate guard (see
  Anti-goals) — covered by the timestamped-title design above, but worth a
  test that generating twice on the same topic succeeds both times.

## Open questions resolved after builder check

- **Can the client call DeepSeek directly from web, or does it need a
  proxy?** Tested live: a browser `fetch()` POST to
  `api.deepseek.com/chat/completions` with a `Content-Type`/`Authorization`
  header succeeds — CORS preflight passes and the response body is readable
  (confirmed via a real request that correctly got back a 401 for an
  invalid key, not a CORS block) — so a direct-from-client design was in
  fact technically viable on web. Moot now: after this check, the design
  changed to a server-side proxy regardless (see Goals/Constraints), so the
  Cloud Function calls DeepSeek server-to-server and no browser-CORS
  question applies at all.
- **How is "doesn't look like the requested language" detected?** Reuse
  this app's existing `LanguageDetectionService` (already used by
  `WordExtractionService` to detect a book's language from a text sample)
  — run it on the generated text and compare against the requested
  language code. No new dependency.
- **Does the generation request need to survive the user navigating
  away?** Yes, for consistency with this app's existing convention: vocabulary
  enrichment already runs on a plain (non-autoDispose) provider specifically
  so it keeps going after the triggering screen is gone
  (`enrichmentProvider`), and book upload already kicks off vocabulary
  extraction as fire-and-forget background work
  (`_extractVocabularyInBackground`). Book generation follows the same
  pattern: a non-autoDispose provider owns the in-flight request, and the
  new book simply appears in the library when it completes, whether or not
  the user is still on the generation screen.

## What's left to the builder

- Exact daily/monthly usage cap values for the `generateBook` Cloud
  Function (mirroring `DAILY_CHARACTER_CAP`'s role), and whether the cap is
  on word count, call count, or both.
- Exact Firestore collection/document naming for usage tracking (mirroring
  `ttsUsage`).
- Exact DeepSeek request/response Dart (client) and TypeScript (function)
  types and error-parsing detail.
- Exact prompt wording (system + user message split, how the known-word
  sample is formatted, how CEFR level is explained to the model).
- Exact known-word sample size cap and sampling method (random vs.
  most-recent vs. most-frequent).
- Exact form layout/widget choices, consistent with the existing bookshelf
  and settings screens' look and feel.
- Whether the generation request shows a progress screen/dialog or disables
  the form in place while waiting (DeepSeek calls will take several
  seconds to tens of seconds depending on length).
