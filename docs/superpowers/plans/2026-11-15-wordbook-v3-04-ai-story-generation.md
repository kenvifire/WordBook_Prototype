# WordBook v3 Plan 4: AI-Generated Story Books Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a learner generate a story book from a topic, difficulty, target language, and target word count (via DeepSeek), and switch every book's word definitions from the English-only dictionary API to a free, language-pair-aware translation API.

**Architecture:** A new `generateBook` function mirrors `addBook`'s book/section/word creation but sources its text and vocabulary from a DeepSeek call instead of extraction, reusing Plan 3's `extractAndLinkWords`-adjacent machinery only for the definition-fetching step (vocabulary itself comes straight from the model, no stopword extraction needed). Generation runs as fire-and-forget background work on this app's long-lived Node process, with the book showing a `generationStatus` the Bookshelf can poll. Translation-based definitions replace `dictionaryApi.ts` everywhere, not just for generated books.

**Tech Stack:** Next.js 15 (App Router) + TypeScript 5, Firebase Admin SDK (Firestore), DeepSeek API (user-supplied key), MyMemory translation API, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-15-wordbook-v3-design.md`

## Global Constraints

- Only story generation uses a paid LLM (DeepSeek); nothing else in this plan calls a paid API.
- A generated book's vocabulary is exactly the word list DeepSeek returns — no separate stopword-extraction step for generated books.
- Generated books use `sectioningMethod: 'fixed_word_count'` (today's 150-word sections) and never go through Plan 3's first-open setup screen.
- Definitions become translation glosses (word → the user's native language) for every book, generated or uploaded; a user with no `nativeLanguage` set gets a plain monolingual definition (`null`, same as today's "no definition available" path) rather than a translation.
- Generation is fire-and-forget on this app's persistent Node process (not serverless) — this plan explicitly relies on that, per `AGENTS.md`'s stack description; it would not work unmodified on a serverless deployment.
- The DeepSeek API key is read from an environment variable (`DEEPSEEK_API_KEY`), never hardcoded, never logged.

## Review Focus

- A DeepSeek call that fails (network error, bad response shape, timeout) must leave the book in a visibly `failed` state on the Bookshelf, not stuck forever in `pending` or silently absent.
- A user with no `nativeLanguage` set must still get a usable (non-crashing) definition experience — `null` definition, same UI fallback Flashcard already has ("No definition available").
- Translating a word into the *same* language it's already in (native language happens to equal the book's language) must not error or return garbage — it should short-circuit to a plain monolingual result.
- Two generation requests for the same user in quick succession must each get their own book doc and not clobber each other's `generationStatus` (no shared mutable state between concurrent generations).
- The target word count input must be bounded (the spec's "my call" range of 5–50) — a request for 500 words must be rejected before it reaches DeepSeek, not silently truncated or sent as-is.

---

## File Structure

- Create: `lib/translate/translateApi.ts`
- Modify: `lib/books/bookService.ts` — swap `fetchDefinition` for `translateWord` in `extractAndLinkWords`
- Create: `lib/ai/deepseek.ts`
- Create: `lib/books/generateBook.ts`
- Create: `app/api/books/generate/route.ts`
- Create: `components/GenerateBookForm.tsx`
- Modify: `app/bookshelf/page.tsx` — wire in the Generate action + pending-card polling

---

### Task 1: Translation-based definitions

**Files:**
- Create: `lib/translate/translateApi.ts`
- Test: `lib/translate/translateApi.test.ts`

**Interfaces:**
- Produces: `export async function translateWord(word: string, sourceLanguage: string, targetLanguage: string | null): Promise<string | null>` — never throws (mirrors `fetchDefinition`'s contract exactly, so every call site that already handles `fetchDefinition`'s `null`/never-throws behavior needs no new error handling).

- [ ] **Step 1: Write failing tests**

```ts
test('returns the MyMemory translation for a word pair', async () => {
  // mock fetch -> MyMemory response shape; assert translateWord('chat', 'french', 'english') resolves to the translated text
});
test('returns null (no translation) when targetLanguage is null', async () => {
  expect(await translateWord('chat', 'french', null)).toBeNull();
});
test('short-circuits to null (no translation needed) when source and target languages are the same', async () => {
  expect(await translateWord('cat', 'english', 'english')).toBeNull();
});
test('returns null on a network failure or timeout, never throws', async () => {});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- translateApi`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

Mirror `lib/dictionary/dictionaryApi.ts`'s shape exactly: a `fetch` call to MyMemory's REST endpoint (`https://api.mymemory.translated.net/get?q=<word>&langpair=<sourceCode>|<targetCode>`) wrapped in `try/catch` returning `null` on any failure, `AbortSignal.timeout(5000)` for the same reason `fetchDefinition` has one. Needs a small language-name → ISO-639-1 code lookup (the mirror image of Task 2 in Plan 3's `detectLanguage.ts` table: `{ english: 'en', spanish: 'es', french: 'fr', german: 'de', russian: 'ru' }`) to build `langpair`. Early-return `null` before calling `fetch` when `targetLanguage === null` or `targetLanguage === sourceLanguage`.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- translateApi`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/translate/translateApi.ts lib/translate/translateApi.test.ts
git commit -m "feat: add translation-based word definitions"
```

---

### Task 2: Swap definitions source in `extractAndLinkWords`

**Files:**
- Modify: `lib/books/bookService.ts`
- Test: `lib/books/bookService.test.ts` (extend existing file)

**Interfaces:**
- Consumes: `translateWord` (Task 1), `getUserProfile` (Plan 1, for `nativeLanguage`).
- Produces: `extractAndLinkWords`'s signature gains nothing new in its parameter list — it already receives `language` (the book's language, i.e. the translation source); it now also needs the acting user's `nativeLanguage`, fetched once via `getUserProfile(userId)` inside `addBook`/`finalizeSectioning` (the two existing callers) rather than threaded as a new parameter, to keep both call sites simple.

- [ ] **Step 1: Write failing tests**

```ts
test('a new word\'s definition comes from translateWord, not fetchDefinition, when nativeLanguage is set', async () => {
  // user profile nativeLanguage: 'spanish'; book language: 'english'; assert the created word's definition
  // matches the mocked translateWord result, and dictionaryApi's fetchDefinition was never called
});
test('a new word gets definition: null when the user has no nativeLanguage set', async () => {});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- bookService`
Expected: FAIL — still calls `fetchDefinition`.

- [ ] **Step 3: Implement**

Replace `fetchDefinitionsWithLimit`'s inner call from `fetchDefinition(words[index])` to `translateWord(words[index], language, nativeLanguage)` (the worker-pool/concurrency-limiting wrapper around it is unchanged — same shape, same `DICTIONARY_CONCURRENCY` limit, arguably worth renaming to `TRANSLATION_CONCURRENCY` for clarity but not required). Remove the now-unused `fetchDefinition` import; `lib/dictionary/dictionaryApi.ts` itself can stay in the repo unused by this plan (deleting dead code is a reasonable follow-up, not required here since nothing else in this plan touches it, and removing it isn't necessary for any test to pass).

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- bookService`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/books/bookService.ts lib/books/bookService.test.ts
git commit -m "feat: use translation-based definitions for every book, not just English"
```

---

### Task 3: DeepSeek client wrapper

**Files:**
- Create: `lib/ai/deepseek.ts`
- Test: `lib/ai/deepseek.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type GenerateStoryInput = {
    topic: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    language: string;
    targetWordCount: number; // 5–50, validated by the caller (Task 4)
  };
  export type GenerateStoryResult = { title: string; text: string; vocabulary: string[] };
  export async function generateStory(input: GenerateStoryInput): Promise<GenerateStoryResult>; // throws on failure — caller decides how to surface it
  ```

- [ ] **Step 1: Write failing tests**

```ts
test('sends topic/difficulty/language/targetWordCount in the prompt and parses title/text/vocabulary from the response', async () => {
  // mock fetch to the DeepSeek endpoint; assert the request body embeds all four inputs
  // and the parsed result matches a fixture response
});
test('throws a clear error when the response is missing a required field', async () => {});
test('throws a clear error on an HTTP failure or timeout (does not silently return a partial result)', async () => {});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- deepseek`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

A single `fetch` to DeepSeek's chat-completions-style endpoint (`DEEPSEEK_API_KEY` from `process.env`), with a system/user prompt instructing the model to return JSON with `title`, `text`, and `vocabulary` (an array of exactly the words it wove into the story), long enough that `text` splits into multiple 150-word sections (`targetWordCount` plus connective prose — the exact prompt wording is this task's own call, not spec-pinned). Parse the response as JSON; throw if `title`/`text`/`vocabulary` aren't present with the right types. Unlike `fetchDefinition`/`translateWord`, this **does** throw on failure — a generation failure needs to flip `generationStatus` to `'failed'` (Task 4), which only works if the caller can catch something.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- deepseek`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/ai/deepseek.ts lib/ai/deepseek.test.ts
git commit -m "feat: add DeepSeek story generation client"
```

---

### Task 4: `generateBook` orchestration

**Files:**
- Create: `lib/books/generateBook.ts`
- Test: `lib/books/generateBook.test.ts`

**Interfaces:**
- Consumes: `generateStory` (Task 3), `splitByFixedWordCount` (Plan 3), `extractAndLinkWords`'s underlying word-creation step — but generated books skip stopword extraction entirely, so this task writes its **own** small word-linking loop (new words only, using the model's exact `vocabulary` list, no `extractVocabulary` call) rather than calling `extractAndLinkWords` as-is; it still uses `translateWord` (Task 1) for definitions and `buildWordId` (Plan 1).
- Produces:
  ```ts
  export type GenerateBookInput = {
    topic: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    language: string;
    targetWordCount: number;
    userId: string;
  };
  export async function startGeneratingBook(input: GenerateBookInput): Promise<{ bookId: string }>;
  // creates the book doc as generationStatus: 'pending' synchronously, kicks off the actual
  // generation + sectioning + word creation WITHOUT awaiting it, and returns immediately.
  ```

- [ ] **Step 1: Write failing tests**

```ts
test('creates a pending book doc immediately and returns before generation resolves', async () => {
  // mock generateStory to never resolve during the test; assert the returned bookId's book doc
  // already exists with generationStatus: 'pending' before manually resolving the mock
});
test('on successful generation, writes sections (fixed word count) and words from the vocabulary list, then sets generationStatus: ready', async () => {});
test('on a generateStory failure, sets generationStatus: failed and creates no sections/words', async () => {});
test('two concurrent calls for the same user create two independent book docs with independent statuses', async () => {});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- generateBook`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

`startGeneratingBook`: create the book doc synchronously with `source: 'ai_generated'`, `sectioningMethod: 'fixed_word_count'`, `language`, `generationStatus: 'pending'`, and the generation inputs (`topic`, `difficultyLevel: difficulty`, `targetWordCount`) kept for reference per the spec; return `{ bookId }` immediately. Then, **not awaited** by the caller, run an inner async function: call `generateStory`; on success, `splitByFixedWordCount(result.text)` into sections, create section docs (section 1 `ready_to_practice`, rest `locked`, same as today), for each word in `result.vocabulary` build its id via `buildWordId`, look up the acting user's `nativeLanguage` via `getUserProfile`, translate via `translateWord(word, language, nativeLanguage)`, `.create()` the word doc (same shape as `newWordDoc` in `bookService.ts`, `addedFromReader: false`), link `sectionRefs`/`wordIds` the same way `extractAndLinkWords` already does (every generated word is assumed to appear somewhere in the text — this task does not re-verify placement, trusting the model's own `vocabulary` list, which keeps this loop simpler than extraction's select-first dance since there's no pre-existing-word collision risk worth optimizing for a freshly generated book); set `generationStatus: 'ready'`. On any thrown error from `generateStory` or the steps after it, catch and set `generationStatus: 'failed'`, logging the error server-side (`console.error`, matching the existing pattern in `app/api/words/[wordId]/rate/route.ts`'s unlock-check catch).

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- generateBook`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/books/generateBook.ts lib/books/generateBook.test.ts
git commit -m "feat: add AI story generation orchestration"
```

---

### Task 5: Generate API route

**Files:**
- Create: `app/api/books/generate/route.ts`
- Test: `app/api/books/generate/route.test.ts`

**Interfaces:**
- Consumes: `startGeneratingBook` (Task 4).
- Produces: `POST /api/books/generate` with body `{ topic: string; difficulty: 'beginner'|'intermediate'|'advanced'; language: string; targetWordCount: number }` → `201 { bookId }`.

- [ ] **Step 1: Write failing tests**

```ts
test('rejects a targetWordCount outside 5-50', async () => {
  // 4 -> 400; 51 -> 400
});
test('rejects an empty topic or an invalid difficulty literal', async () => {});
test('requires auth (401 without a session)', async () => {});
test('on valid input, calls startGeneratingBook and returns 201 with the bookId', async () => {});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- 'books/generate'`
Expected: FAIL — route doesn't exist.

- [ ] **Step 3: Implement**

Validate `topic` (non-empty string), `difficulty` (one of the three literals), `language` (non-empty string — this plan doesn't constrain it to the same 5-language table `detectLanguage` uses, since generation explicitly lets the user pick any target language per the spec's Bookshelf bullet), `targetWordCount` (integer, `5 <= n <= 50`, mirroring the spec's "my call" range) — 400 with a message naming the first invalid field. Call `startGeneratingBook({ ...body, userId: user.uid })`, return `201 { bookId }`.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- 'books/generate'`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/books/generate
git commit -m "feat: add the story-generation API route"
```

---

### Task 6: Generate form + Bookshelf wiring + pending-card polling

**Files:**
- Create: `components/GenerateBookForm.tsx`
- Modify: `app/bookshelf/page.tsx` (and/or `components/BookshelfList.tsx` from Plan 2, whichever currently renders the per-book cards)
- Test: `components/GenerateBookForm.test.tsx`, extend `app/bookshelf/page.test.tsx`

**Interfaces:**
- Consumes: `POST /api/books/generate` (Task 5); reads `generationStatus` on each book.

- [ ] **Step 1: Write failing tests**

```tsx
test('GenerateBookForm submits topic/difficulty/language/targetWordCount and shows the new book as pending', async () => {});
test('a book card with generationStatus: pending shows a "generating…" placeholder instead of its progress indicator', async () => {});
test('a book card with generationStatus: failed shows an error state, not a silent disappearance', async () => {});
test('the Bookshelf polls (re-fetches) while any book is pending, and stops once none are', async () => {});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- GenerateBookForm bookshelf`
Expected: FAIL — form and polling don't exist.

- [ ] **Step 3: Implement**

`GenerateBookForm` (`'use client'`): the four fields from the mockup (topic text input, language text input, difficulty as three buttons, target-word-count number input, bounds enforced client-side too for fast feedback), `POST`s to `/api/books/generate`, then `router.refresh()`. On the Bookshelf's book-card rendering, branch on `generationStatus`: `'pending'` → the dashed "generating…" placeholder card from the mockup; `'failed'` → a visible error card (not hidden); `'ready'`/`undefined` (uploaded books have no `generationStatus` field at all) → today's normal card. Add a small client wrapper (e.g. `components/BookshelfPendingPoller.tsx`) that, when any book in the initial list is `'pending'`, sets a `setInterval` calling `router.refresh()` every 3 seconds, clearing itself once a refreshed server render contains no more `'pending'` books (simplest signal: re-check the prop it was given after each parent re-render).

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- GenerateBookForm bookshelf`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/GenerateBookForm.tsx components/BookshelfPendingPoller.tsx app/bookshelf
git commit -m "feat: add the Generate-a-book flow to Bookshelf"
```

---

## Self-Review Notes

- **Spec coverage:** DeepSeek-only generation (Tasks 3–4), the topic/difficulty/language/word-count inputs (Task 5), translation-based definitions for every book (Tasks 1–2), the "appears on the shelf exactly like an uploaded one" requirement via the pending/ready/failed status handling (Task 6) — all covered.
- **Type consistency:** `GenerateStoryInput`/`GenerateBookInput` both use the same `difficulty` union and `language: string` shape as the validated API route body (Task 5) — no silent re-typing between layers.
- **Proportion:** 6 tasks for a single, well-bounded feature (one generation path, one definitions swap) is proportionate; the translation swap (Tasks 1–2) is small because it's structurally almost identical to the dictionary lookup it replaces.
