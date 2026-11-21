# AI Book Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Generate Book" path, alongside Upload Book, that produces a
real, practiceable book from an LLM (DeepSeek) given language, CEFR level,
topic, target word count, and new-word percentage — using a server-side
Cloud Function (no user-facing API key) and the user's own existing
vocabulary (derived from their `Word` records) to decide what counts as new.

**Architecture:** A new `generateBook` Firebase Cloud Function mirrors the
existing `synthesizeSpeech` function exactly (auth required, strict input
validation, server-held DeepSeek key, Firestore usage cap). The Flutter
client computes a sample of the user's known words for the target language
from data it already has, calls the function, and feeds the returned text
through the exact same ingestion path an uploaded `.txt` file already uses.

**Tech Stack:** Firebase Cloud Functions (TypeScript, `firebase-functions`
v2, Node 22's built-in `fetch`), Flutter (`cloud_functions` package, already
a dependency), Firestore for usage tracking.

**Spec:** `docs/superpowers/specs/2026-11-21-ai-book-generation-design.md`

## Global Constraints

- DeepSeek API: `POST https://api.deepseek.com/chat/completions`, model
  `deepseek-chat`, `Authorization: Bearer <key>`, called server-side only.
- CEFR levels, exact codes: `A1`, `A2`, `B1`, `B2`, `C1`, `C2`.
- Max word count per generation: `5000` — enforced on the client form *and*
  re-validated inside the Cloud Function.
- Language codes accepted by the function: the same codes as
  `SupportedLanguage.all` in `lib/providers/language_provider.dart` (`ar`,
  `de`, `en`, `es`, `fr`, `hi`, `id`, `it`, `ja`, `ko`, `ms`, `nl`, `pl`,
  `pt`, `ru`, `th`, `tr`, `vi`, `zh`, `zh-TW`).
- No API key is ever entered, stored, or displayed by the user. No new
  Settings UI for this feature.
- Known words for a language are derived from `WordRepository.getWordsByUser(userId)`
  — filter to the target language, status `!= WordStatus.newWord`. No new
  store method, no new schema.
- A generated book is ingested through the exact same path an uploaded
  `.txt` already uses: `BookService.parseBookBytes(bytes, '.txt', title)`
  for parsing, `createBookFileIO().store(...)` for bytes, then the same
  `Book` creation / vocabulary-extraction flow `uploadBook()` already runs.
- Book generation survives the user navigating away, the same way
  `enrichmentProvider` and `_extractVocabularyInBackground` already do (a
  plain, non-autoDispose provider).
- Generated book titles include a timestamp (never just the bare topic) so
  two generations on the same topic never collide with the upload flow's
  exact-title duplicate check.
- The Cloud Function is the authority on cost control: it must reject
  over-cap requests itself, regardless of what the client sends or skips.

## Review Focus

- A request that skips or lies about the word-count cap must still be
  rejected by the Cloud Function itself, not just blocked by the form
  (Task 1).
- A user with zero known words yet in the target language (first-ever
  generation in that language) must still get a sensible request and a
  sensible generation — not an error, not a malformed payload (Tasks 2, 3).
- A DeepSeek response that's empty, error-shaped, or doesn't look like the
  requested language must be treated as a failed generation — nothing
  gets saved to the library (Task 3).
- Two generations with the same topic, back to back, must both succeed —
  neither collides with the upload flow's exact-title duplicate check
  (Task 4).
- The per-user daily usage cap must actually persist and accumulate across
  separate calls (not reset or miscount) — verify with two calls in the
  same day, not just one (Task 1).

---

### Task 1: `generateBook` Cloud Function

**Files:**
- Modify: `functions/src/index.ts`

**Interfaces:**
- Produces: an `onCall` function named `generateBook`, callable from the
  Flutter client as `FirebaseFunctions.instance.httpsCallable('generateBook').call({...})`.
  Request shape:
  ```ts
  interface GenerateBookRequest {
    language?: unknown;   // one of Global Constraints' language codes
    level?: unknown;      // one of A1/A2/B1/B2/C1/C2
    topic?: unknown;      // string, 1-200 chars
    wordCount?: unknown;  // number, 1-5000
    newWordPercentage?: unknown; // number, 0-100
    knownWords?: unknown; // string[], already capped/sampled by the client
  }
  ```
  Success response: `{ text: string }`. Failures use `HttpsError` with codes
  `unauthenticated`, `invalid-argument`, `resource-exhausted` (cap reached),
  or `internal` (DeepSeek call failed) — matching `synthesizeSpeech`'s
  existing pattern exactly.

- [ ] **Step 1: Add the language/level allowlists and constants**

  At the top of `functions/src/index.ts`, alongside the existing
  `LOCALE_BY_LANGUAGE_CODE`/`MAX_TEXT_LENGTH` constants, add:
  `VALID_LANGUAGE_CODES` (the 20 codes from Global Constraints),
  `VALID_CEFR_LEVELS = ['A1','A2','B1','B2','C1','C2']`,
  `MAX_WORD_COUNT = 5000`, `MAX_TOPIC_LENGTH = 200`,
  `MAX_KNOWN_WORDS = 500` (defensive cap on the array the client sends,
  independent of whatever sample size the client's own logic picks),
  `DAILY_WORD_CAP = 10000` (per user, mirrors `DAILY_CHARACTER_CAP`'s
  role).

- [ ] **Step 2: Write `generateBook`'s validation and cap-check body**

  Following `synthesizeSpeech`'s exact structure (auth check first, then
  validate every field against the constants from Step 1, throwing
  `HttpsError('invalid-argument', ...)` per bad field with a specific
  message naming the field). Usage cap check: read/increment a
  `bookGenerationUsage` Firestore collection the same way
  `synthesizeSpeech` reads/increments `ttsUsage` — daily doc
  `user_${uid}_${today}` tracking a `words` counter, monthly doc
  `monthly_${month}` for cost monitoring. Reject with
  `HttpsError('resource-exhausted', ...)` if `usedToday + wordCount >
  DAILY_WORD_CAP`, before calling DeepSeek (not after — don't spend the
  budget check after already paying for the call).

- [ ] **Step 3: Build the DeepSeek request and call it**

  Build the prompt from the validated fields: a system-style instruction
  naming the target language, CEFR level, topic, target word count, the
  known-words list (joined, comma-separated — if `knownWords` is empty,
  say so explicitly rather than sending an empty list silently, so the
  model knows to write at a beginner level using only its own judgment of
  what's elementary for that CEFR level), and the new-word percentage
  framed as "roughly N% of the distinct content words should be vocabulary
  not in that list, still appropriate for a {level} learner — not
  esoteric." Instruct the model to output *only* the body text, no title,
  no markdown, no commentary. `fetch()` is available globally in this
  project's Node 22 runtime — no new dependency needed. Read the DeepSeek
  key via `defineSecret` (`firebase-functions/params`) rather than
  `process.env` directly, and declare it in the function's options
  (`onCall({region: ..., cors: true, secrets: [deepseekApiKey]}, ...)`),
  matching how Firebase Functions v2 expects secrets to be declared. A
  non-2xx response or a response with no usable text throws
  `HttpsError('internal', 'Book generation failed.')` — mirror
  `synthesizeSpeech`'s try/catch-and-log shape exactly.

- [ ] **Step 4: Record usage and return**

  On success, increment the same two Firestore docs from Step 2 by the
  *actual* returned word count (a simple whitespace split is fine — this
  is cost tracking, not linguistics), using `FieldValue.increment`, in one
  batch, exactly like `synthesizeSpeech` does. Return `{ text }`.

- [ ] **Step 5: Build and verify validation/cap logic via the emulator**

  Run `npm run build` inside `functions/` to confirm it compiles. Then run
  `firebase emulators:start --only functions,firestore` and call
  `generateBook` against the emulator (via `firebase functions:shell`, or
  a throwaway script using the client SDK pointed at the emulator) to
  verify: an unauthenticated call is rejected; an invalid language/level/
  topic-too-long/wordCount-over-5000 is rejected with the specific field
  named; and — this is the one from Review Focus that needs two calls, not
  one — two calls in the same emulated day whose word counts together
  exceed `DAILY_WORD_CAP` succeed-then-reject, with the Firestore usage
  doc's `words` counter reflecting the first call's amount in between. All
  of this exercises Step 1/2's logic without ever reaching Step 3's
  DeepSeek call (the cap/validation checks happen first), so none of it
  needs a real DeepSeek key.

  A real end-to-end generation (the DeepSeek call actually succeeding) is
  verified live in Task 5, once a real key is configured and this function
  is deployed — not here.

- [ ] **Step 6: Note the manual deploy step, but don't deploy yet**

  The DeepSeek key must be set once via
  `firebase functions:secrets:set DEEPSEEK_API_KEY` (a manual, one-time
  operational step outside this plan — this task does not include
  obtaining or entering a real key). Do not run `firebase deploy` as part
  of this task; that happens once when the whole feature is ready, in a
  dedicated deploy step your human partner will review before you proceed.

- [ ] **Step 7: Commit**

  ```bash
  cd functions && git add src/index.ts && git commit -m "feat: add generateBook Cloud Function for AI book generation"
  ```

---

### Task 2: Known-word sampling (client)

**Files:**
- Create: `lib/services/vocabulary/vocabulary_knowledge_service.dart`
- Test: `test/services/vocabulary/vocabulary_knowledge_service_test.dart`

**Interfaces:**
- Consumes: `WordRepository.getWordsByUser(String? userId)` (existing,
  returns `Future<List<Word>>`).
- Produces:
  ```dart
  class VocabularyKnowledgeService {
    /// Known words for [language] from the user's own history: every
    /// distinct word text (case-insensitive, deduplicated) across all the
    /// user's books where `word.language == language` and
    /// `word.status != WordStatus.newWord`. Capped and randomly sampled to
    /// [sampleSize] when there are more matches than that — exact
    /// generations don't need the whole history, just a representative
    /// slice that fits a prompt's token budget.
    Future<List<String>> knownWordsForLanguage(
      String? userId,
      String language, {
      int sampleSize = 300,
    });
  }
  ```
  Later tasks depend on this exact method name/signature.

- [ ] **Step 1: Write the failing tests**

  In the new test file, construct `Word` objects directly (no repository
  needed for this — test a pure function first; see Step 2) covering: (a)
  words in the target language past `newWord` status are included, (b)
  words still `newWord` status are excluded, (c) words in a different
  language are excluded, (d) duplicate word text (same word, different
  book/case) appears once in the result, (e) when matches exceed
  `sampleSize`, the result has exactly `sampleSize` entries, (f) an empty
  input list returns an empty result (the zero-known-words case from
  Review Focus).

  Structure the service so this logic is a pure, directly-testable
  function — e.g. a static/top-level
  `List<String> sampleKnownWords(List<Word> words, String language, int sampleSize)`
  — with `knownWordsForLanguage` as a thin wrapper that calls
  `WordRepository().getWordsByUser(userId)` and passes the result through
  it. Test the pure function directly; it needs no platform and runs in
  the default `flutter test` VM target.

- [ ] **Step 2: Run tests to verify they fail**

  Run: `flutter test test/services/vocabulary/vocabulary_knowledge_service_test.dart`
  Expected: FAIL (service doesn't exist yet).

- [ ] **Step 3: Implement `VocabularyKnowledgeService`**

  Implement `sampleKnownWords` and `knownWordsForLanguage` per the
  signature above.

- [ ] **Step 4: Run tests to verify they pass**

  Run the same command as Step 2. Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add lib/services/vocabulary/vocabulary_knowledge_service.dart test/services/vocabulary/vocabulary_knowledge_service_test.dart
  git commit -m "feat: add known-word sampling for AI book generation"
  ```

---

### Task 3: `BookGenerationService` (client)

**Files:**
- Create: `lib/services/book_generation/book_generation_service.dart`
- Test: `test/services/book_generation/book_generation_service_test.dart`

**Interfaces:**
- Consumes: `LanguageDetectionService.detectLanguage(String text)` (existing, see
  `lib/services/vocabulary/language_detection_service.dart`), the
  `cloud_functions` package's `FirebaseFunctions.instance.httpsCallable(...)`
  (see `lib/services/cloud_tts_service.dart` for this app's existing exact
  usage pattern of that package).
- Produces:
  ```dart
  class BookGenerationRequest {
    final String language;       // one of Global Constraints' codes
    final String level;          // CEFR code
    final String topic;
    final int wordCount;         // already clamped to <= 5000 by the caller
    final int newWordPercentage; // 0-100
    final List<String> knownWords;
  }

  class BookGenerationException implements Exception {
    final String message; // already user-facing/friendly
  }

  class BookGenerationService {
    /// Calls the generateBook Cloud Function and returns the generated
    /// text. Throws [BookGenerationException] (with a message safe to
    /// show the user directly) on any failure: not signed in, server-side
    /// cap reached, DeepSeek/network failure, empty response, or a
    /// response that doesn't look like it's actually in [request.language]
    /// (checked via LanguageDetectionService — see Review Focus).
    Future<String> generate(BookGenerationRequest request);
  }
  ```
  Task 4 depends on this exact `generate`/`BookGenerationException` shape.

- [ ] **Step 1: Write the failing tests**

  Cover, without touching the network or Firebase: a pure helper
  `bool looksLikeWrongLanguage(String text, String expectedLanguage)` that
  wraps `LanguageDetectionService` — test it directly with a short English
  sample against `expectedLanguage: 'es'` (should return true) and against
  `'en'` (should return false). Also test that `BookGenerationException`'s
  `message` is readable (a plain `toString`/field check).

  The actual Cloud Function call can't run in a VM test (no Firebase
  project/emulator available there) — this task does not attempt to unit
  test `generate()`'s network path; Task 5 verifies the full flow live, as
  this project has done throughout for anything requiring a real backend
  or browser (see e.g. the IndexedDB persistence work's `flutter test
  --platform chrome` tests paired with live verification).

- [ ] **Step 2: Run tests to verify they fail**

  Run: `flutter test test/services/book_generation/book_generation_service_test.dart`
  Expected: FAIL (file doesn't exist yet).

- [ ] **Step 3: Implement `BookGenerationService`**

  `generate()`: calls
  `FirebaseFunctions.instance.httpsCallable('generateBook').call({...})`
  with the request fields. Catches `FirebaseFunctionsException` and maps
  its `.code` to a friendly `BookGenerationException` message (`'unauthenticated'`
  → "Please sign in and try again.", `'resource-exhausted'` → "You've hit
  today's generation limit — try again tomorrow.", anything else →
  a generic "Couldn't generate the book. Please try again."). On success,
  reads `result.data['text']` as a `String`; if null/empty, throws
  `BookGenerationException('Generation returned no text.')`. Runs
  `looksLikeWrongLanguage` on the result; if true, throws
  `BookGenerationException("The result didn't come back in the requested
  language — please try again.")`.

- [ ] **Step 4: Run tests to verify they pass**

  Run the same command as Step 2. Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add lib/services/book_generation/ test/services/book_generation/
  git commit -m "feat: add BookGenerationService calling the generateBook Cloud Function"
  ```

---

### Task 4: Wire generation into `BooksStateNotifier`

**Files:**
- Modify: `lib/providers/books_state_provider.dart`

**Interfaces:**
- Consumes: `BookGenerationService.generate` (Task 3),
  `VocabularyKnowledgeService.knownWordsForLanguage` (Task 2),
  `BookService.parseBookBytes` (existing).
- Produces:
  ```dart
  Future<void> generateBook({
    required String language,
    required String level,
    required String topic,
    required int wordCount,
    required int newWordPercentage,
  })
  ```
  (a method on the same notifier `uploadBook()` already lives on — it
  builds the full `BookGenerationRequest` itself, including `knownWords`,
  rather than taking a pre-built one, since computing `knownWords` is this
  method's own responsibility, not the caller's), plus new `BooksState`
  fields `isGenerating` (bool) and `generationError` (String?) alongside
  the existing `isUploading`/`error`. Task 5's UI depends on these exact
  names and signature.

- [ ] **Step 1: Extract the shared ingestion tail from `uploadBook()`**

  `uploadBook()` (lines ~71-197 today) does, after it has `bookContent`,
  `extension`, and raw `bytes`: duplicate-title check, `bookId` generation,
  `createBookFileIO().store(...)`, `Book` construction, `repository.addBook`,
  language detection, cover extraction, `repository.updateBook`,
  `loadBooks()`, and `_extractVocabularyInBackground(book)`. Extract the
  parts that don't depend on `file_picker`/a real file path into a private
  helper, e.g.:
  ```dart
  Future<Book?> _ingestBook({
    required BookContent content,
    required String extension,
    required Uint8List bytes,
    required String fileName,
    String? sourcePath,
    String? knownLanguage, // skip detection when already known (generated books)
  })
  ```
  returning the created `Book`, or `null` if it was a duplicate (setting
  `state.error` itself in that case, matching `uploadBook()`'s existing
  behavior) or the upload was cancelled mid-flight. `uploadBook()` calls
  this helper for everything after it has `bookContent`/`bytes`/`extension`;
  its own body shrinks to: file picking, extension/bytes resolution, then
  one call to `_ingestBook(...)`. When `knownLanguage` is provided, skip
  the `WordExtractionService().detectBookLanguage(book)` call and set
  `book.language = knownLanguage` directly instead.

- [ ] **Step 2: Add the `isGenerating`/`generationError` fields to `BooksState`**

  Find `BooksState`'s definition (likely in the same file or a nearby
  `books_state.dart` — check before assuming) and add the two fields next
  to `isUploading`/`error`, following that class's existing `copyWith`
  pattern exactly.

- [ ] **Step 3: Implement `generateBook(...)`**

  Per the signature above. Sets `state.isGenerating = true`, clears
  `generationError`. Calls
  `VocabularyKnowledgeService().knownWordsForLanguage(user?.uid, language)`,
  builds the full `BookGenerationRequest`, calls
  `BookGenerationService().generate(request)`. On success: builds
  `BookContent` via `BookService().parseBookBytes(utf8.encode(text), '.txt', title)`
  where `title` is `'$topic ($level, ${DateTime.now().millisecondsSinceEpoch})'`
  (Global Constraints: timestamped title), then calls `_ingestBook(...)`
  from Step 1 with `knownLanguage: language`. On any
  `BookGenerationException`, sets `state.generationError =
  e.message` and `isGenerating = false` — does not throw past this method
  (mirrors `uploadBook()`'s own catch-and-set-state pattern). On success,
  sets `isGenerating = false` after `_ingestBook` completes.

  This method does not get cancelled mid-flight the way `uploadBook()`
  can be (no `_bailIfUploadCancelled` equivalent) — per Global Constraints,
  it's expected to keep running even if the user navigates away, since
  `BooksStateNotifier` itself (via `booksStateProvider`) is already a
  plain, non-autoDispose provider; no new provider is needed for this.

- [ ] **Step 4: Manually verify `uploadBook()` still works unchanged**

  This task's Step 1 refactors code every existing upload already depends
  on. Run the full existing test suite (`flutter test`) to catch anything
  covered there, then manually verify TXT/EPUB/PDF upload still works live
  (reuse this session's established pattern: build, deploy to a
  non-production target or verify in a local run, upload one book of each
  format, confirm it appears and reads correctly) before moving on —
  do not rely on the test suite alone, since `books_state_provider.dart`
  has no direct unit test coverage today.

- [ ] **Step 5: Commit**

  ```bash
  git add lib/providers/books_state_provider.dart
  git commit -m "feat: wire AI book generation into BooksStateNotifier"
  ```

---

### Before Task 5: deploy the Cloud Function

Task 5's own Step 4 needs `generateBook` actually deployed and callable —
the local emulator Task 1 used isn't reachable from a real device or a
deployed web build. Before starting Task 5:

1. Ask your human partner to run
   `firebase functions:secrets:set DEEPSEEK_API_KEY` themselves (do not ask
   for or handle the real key value).
2. Ask before running `firebase deploy --only functions` — this is a push
   to shared production infrastructure, the same kind of action this
   project has asked about every time this session.

### Task 5: Generate Book screen and bookshelf entry point

**Files:**
- Create: `lib/screens/bookshelf/generate_book_screen.dart`
- Modify: `lib/screens/bookshelf/bookshelf_screen.dart`

**Interfaces:**
- Consumes: `BooksStateNotifier.generateBook` and the `isGenerating`/
  `generationError` fields (Task 4), `SupportedLanguage.all` and
  `User.learningLanguage` (existing) for the language field's default.

- [ ] **Step 1: Build the Generate Book form**

  A form with: Language (dropdown from `SupportedLanguage.all`, defaulting
  to the current user's `learningLanguage` if set), Level (dropdown,
  `A1`..`C2`), Topic (`TextField`, required, non-empty), Word count
  (numeric input, default a reasonable value like 500, clamped to
  `[1, 5000]` — reject/clamp in the UI itself, not just visually), New
  word percentage (`Slider`, 0-100, default e.g. 20). A submit button
  calls `ref.read(booksStateProvider.notifier).generateBook(...)` with the
  form's values, then pops back to the bookshelf — generation continues
  in the background per Task 4's design, so this screen does not need to
  stay open or show a blocking spinner for the whole duration.

- [ ] **Step 2: Add generation progress/error feedback on the bookshelf**

  In `bookshelf_screen.dart`, alongside the existing `isUploading`
  handling, watch `isGenerating`/`generationError` the same way
  (`ref.listen` for `generationError` showing a `SnackBar`, matching the
  existing `error` listener; a simple non-blocking indicator — e.g. in the
  app bar or as a persisted banner — while `isGenerating` is true). When
  generation finishes successfully, the new book simply appears via the
  existing `loadBooks()` call Task 4's `_ingestBook` already triggers — no
  separate "done" signal needed.

- [ ] **Step 3: Wire the "+" entry point**

  Change the FAB/app-bar add-button handler (currently calls
  `_handleAddBook` directly) to show a bottom sheet offering **Upload
  Book** / **Generate Book**, matching the existing
  `_showBookOptions`-style bottom sheet already used elsewhere in this
  screen. "Upload Book" keeps calling `_handleAddBook` exactly as today;
  "Generate Book" pushes `GenerateBookScreen`.

- [ ] **Step 4: Manually verify the full flow live**

  Build and verify live (per this project's established pattern for
  anything touching a real backend): sign in, open Generate Book, fill the
  form, submit, confirm a usage-cap/auth error shows a sensible message if
  triggered, confirm a successful generation produces a book that opens,
  reads, and extracts vocabulary exactly like an uploaded one. Also verify
  generating twice with the same topic succeeds both times (Review Focus).

- [ ] **Step 5: Commit**

  ```bash
  git add lib/screens/bookshelf/generate_book_screen.dart lib/screens/bookshelf/bookshelf_screen.dart
  git commit -m "feat: add Generate Book screen and bookshelf entry point"
  ```
