# WordBook v3 Plan 1: Data-Model Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Firestore data model multi-language-aware and give the recognition-rate gate a per-user configurable threshold, without changing any page's visible behavior yet.

**Architecture:** Add a `language` field to books/words and fold it into the deterministic word-document ID (`${userId}_${language}_${word}`); add a `users/{uid}` profile document read through a small accessor with safe defaults; make `maybeUnlockNextSection` read that per-user threshold instead of a hardcoded constant; make word normalization diacritic-aware so non-English words tokenize correctly. This is plan 1 of 5 for the v3 redesign — later plans (tabs/settings, book detail/reading modes, AI generation, caching) build on what this plan lands.

**Tech Stack:** Next.js 15 (App Router) + TypeScript 5, Firebase Admin SDK (Firestore), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-15-wordbook-v3-design.md`

## Global Constraints

- Word document IDs become `${userId}_${language}_${word}` (was `${userId}_${word}`); still created with `.create()`, never `.set()`/upsert.
- `recognitionThreshold` is stored as a fraction 0–1 (not a percentage) to match `computeRecognitionRate`'s existing 0–1 return type; the percentage framing (50%–100%) is a Settings-UI concern for a later plan, not a storage concern here.
- Default `recognitionThreshold` is `0.8` (today's hardcoded value) when a user has no profile doc or no value set.
- Every Firestore query/mutation this plan adds or touches must stay filtered by the authenticated user's uid (`AGENTS.md`'s Admin-SDK-only rule).
- Both `extractVocabulary` and `normalizeWord` (tap-to-define) must call the exact same token-normalization logic — they must never drift independently (this is the existing sharp edge in `AGENTS.md`, now extended to diacritics).
- `firestore.rules` deploys manually/separately from CI (`.github/workflows/deploy.yml` only deploys application code) — a task that changes the word-create rule is not "done" until the human partner confirms the manual deploy ran.
- This plan hardcodes the language passed to `addBook` as `'english'` at the one call site (`app/api/books/route.ts`) — real language detection is explicitly out of scope here and lands in Plan 3 (Book detail / reading modes), which already restructures the upload pipeline.

## Review Focus

- A word containing diacritics (e.g. "café", "mañana") must tokenize and normalize to a stable, non-empty word under the new Unicode-aware pattern — the old `/[a-zA-Z']+/` regex would silently drop these words entirely.
- A user with no `users/{uid}` profile document yet (true for every account that exists before this plan ships) must get sane defaults from `getUserProfile` — no throw, no `undefined` threshold reaching `maybeUnlockNextSection`.
- The same spelling in two different languages (e.g. "chat" in English vs. French) must resolve to two distinct word documents, never collide into one.
- A wordId forged to claim a different language than the `language` field in the document body (id-squatting variant) must still be rejected the same way the existing userId-squatting check already is — the new scheme must not quietly reopen that defense.
- A user who has set a *non-default* `recognitionThreshold` (e.g. `1.0`) must have it actually honored — a section sitting at 90% recognition must stay locked, not fall back to the old hardcoded `0.8`.

---

## File Structure

- Create: `lib/text/normalizeWord.ts` (modify in place — diacritic-aware token pattern)
- Create: `lib/firebase/wordId.ts` — `buildWordId`
- Create: `lib/users/userProfile.ts` — `getUserProfile` / `updateUserProfile`
- Modify: `lib/text/extractVocabulary.ts` — reuse the shared token pattern
- Modify: `lib/sections/sectionService.ts` — per-user threshold
- Modify: `lib/books/bookService.ts` — `language` field + new word-ID scheme
- Modify: `app/api/words/lookup/route.ts` — `language`-aware wordId
- Modify: `components/WordPopup.tsx`, `app/book/[id]/read/[sectionNumber]/page.tsx` — thread `language` through
- Modify: `app/api/books/route.ts` — pass the (temporary, hardcoded) language into `addBook`
- Modify: `firestore.rules` — overlap rule, then tightened rule (two separate tasks, two separate manual deploys)

---

### Task 1: Diacritic-aware token normalization

**Files:**
- Modify: `lib/text/normalizeWord.ts`
- Modify: `lib/text/extractVocabulary.ts`
- Test: `lib/text/normalizeWord.test.ts`, `lib/text/extractVocabulary.test.ts` (extend existing files)

**Interfaces:**
- Produces: `export const TOKEN_PATTERN_SOURCE: string` (the regex source, no flags — e.g. `"[\\p{L}\\p{M}']+"`), `export function normalizeWord(raw: string): string`, `export function normalizeToken(raw: string): string`, `export function normalizeQuotes(text: string): string` (signatures unchanged from today).

- [ ] **Step 1: Write failing tests for diacritic handling**

```ts
// lib/text/normalizeWord.test.ts
test('normalizeWord keeps accented letters', () => {
  expect(normalizeWord('café')).toBe('café');
  expect(normalizeWord('¡mañana!')).toBe('mañana');
});

// lib/text/extractVocabulary.test.ts
test('extractVocabulary keeps accented words not in the common-words list', () => {
  expect(extractVocabulary('El café está en la mañana.')).toContain('café');
  expect(extractVocabulary('El café está en la mañana.')).toContain('mañana');
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- normalizeWord extractVocabulary`
Expected: FAIL — accented characters stripped to `''` or missing from the result array.

- [ ] **Step 3: Implement the Unicode-aware pattern**

In `lib/text/normalizeWord.ts`: replace the `/[a-zA-Z']+/` literal with a pattern built from `TOKEN_PATTERN_SOURCE = "[\\p{L}\\p{M}']+"` (letters + combining marks + apostrophe), applied with the `u` flag. `normalizeWord` builds `new RegExp(TOKEN_PATTERN_SOURCE, 'u')` (first match only). In `normalizeToken`, replace the final `if (!/[a-z]/.test(word)) return '';` check with `if (!/\p{L}/u.test(word)) return '';` (letters only — `.toLowerCase()` already handles casing for non-Latin scripts correctly enough for this scope). In `lib/text/extractVocabulary.ts`, replace its own separately-written `/[a-zA-Z']+/g` with `new RegExp(TOKEN_PATTERN_SOURCE, 'gu')`, importing `TOKEN_PATTERN_SOURCE` from `normalizeWord.ts` so the two files can never drift apart on what counts as a token character.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- normalizeWord extractVocabulary`
Expected: PASS, and all pre-existing tests in both files still pass unchanged (English-only behavior is a strict subset of the new pattern).

- [ ] **Step 5: Commit**

```bash
git add lib/text/normalizeWord.ts lib/text/extractVocabulary.ts lib/text/normalizeWord.test.ts lib/text/extractVocabulary.test.ts
git commit -m "feat: make word tokenization diacritic-aware"
```

---

### Task 2: `buildWordId` helper

**Files:**
- Create: `lib/firebase/wordId.ts`
- Test: `lib/firebase/wordId.test.ts`

**Interfaces:**
- Produces: `export function buildWordId(userId: string, language: string, word: string): string` — returns `` `${userId}_${language}_${word}` ``. Used by Task 4 (`bookService.ts`) and Task 5 (`lookup/route.ts`).

- [ ] **Step 1: Write the failing test**

```ts
test('buildWordId joins userId, language, and word with underscores', () => {
  expect(buildWordId('u1', 'english', 'book')).toBe('u1_english_book');
});
test('buildWordId keeps the same word in different languages distinct', () => {
  expect(buildWordId('u1', 'english', 'chat')).not.toBe(buildWordId('u1', 'french', 'chat'));
});
```

- [ ] **Step 2: Run test, confirm it fails**

Run: `npm test -- wordId`
Expected: FAIL with "buildWordId is not defined" (module doesn't exist yet).

- [ ] **Step 3: Implement `buildWordId`**

One-line template-string join, no edge cases to decide.

- [ ] **Step 4: Run test, confirm it passes**

Run: `npm test -- wordId`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/firebase/wordId.ts lib/firebase/wordId.test.ts
git commit -m "feat: add language-scoped word ID builder"
```

---

### Task 3: User profile accessor with safe defaults

**Files:**
- Create: `lib/users/userProfile.ts`
- Test: `lib/users/userProfile.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type Theme = 'light' | 'dark' | 'system';
  export type UserProfile = {
    nativeLanguage: string | null;
    avatarUrl: string | null;
    theme: Theme;
    recognitionThreshold: number; // fraction 0..1
  };
  export const DEFAULT_RECOGNITION_THRESHOLD = 0.8;
  export const DEFAULT_THEME: Theme = 'system';
  export async function getUserProfile(userId: string): Promise<UserProfile>;
  export async function updateUserProfile(userId: string, fields: Partial<UserProfile>): Promise<void>;
  ```
- Consumes: `getFirestore(getAdminApp())` from `lib/firebase/admin.ts` (existing pattern used throughout `lib/`).

- [ ] **Step 1: Write failing tests**

```ts
test('getUserProfile returns defaults when no profile doc exists', async () => {
  // mock firestore: users/{uid}.get() -> { exists: false }
  const profile = await getUserProfile('u1');
  expect(profile).toEqual({
    nativeLanguage: null,
    avatarUrl: null,
    theme: 'system',
    recognitionThreshold: 0.8,
  });
});

test('getUserProfile fills in only the missing fields when the doc exists but is partial', async () => {
  // mock: users/{uid}.get() -> { exists: true, data: () => ({ nativeLanguage: 'spanish' }) }
  const profile = await getUserProfile('u1');
  expect(profile.nativeLanguage).toBe('spanish');
  expect(profile.recognitionThreshold).toBe(0.8);
});

test('updateUserProfile merges fields without clobbering others', async () => {
  // assert the mocked doc ref's .set() is called with ({ theme: 'dark' }, { merge: true })
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- userProfile`
Expected: FAIL — module not defined.

- [ ] **Step 3: Implement `getUserProfile` / `updateUserProfile`**

Mirror the existing mocking style used by `lib/sections/sectionService.test.ts` (in-memory fake Firestore) rather than inventing a new one. `getUserProfile` reads `db.collection('users').doc(userId).get()`; if the doc doesn't exist or a field is missing, fall back to the default for that field individually (a doc with only `theme` set must still report `recognitionThreshold: 0.8`, not throw). `updateUserProfile` does `db.collection('users').doc(userId).set(fields, { merge: true })` — no validation/clamping here (that belongs to the Settings API route in Plan 2, which is the layer that knows the 50%–100% UI bound).

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- userProfile`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/users/userProfile.ts lib/users/userProfile.test.ts
git commit -m "feat: add user profile accessor with safe defaults"
```

---

### Task 4: `firestore.rules` — overlap rule for the word-ID scheme change

**Files:**
- Modify: `firestore.rules`

**Interfaces:**
- None (no code interface — this is a rules-only task, and the next code task depends on this rule being *live*, not just committed).

- [ ] **Step 1: Write the overlap rule**

Replace the `words/{wordId}` `create` rule's condition so it accepts **either** the old shape or the new shape:

```
allow create: if request.auth != null &&
  request.resource.data.userId == request.auth.uid &&
  (
    wordId == request.auth.uid + '_' + request.resource.data.word ||
    (
      request.resource.data.language is string &&
      wordId == request.auth.uid + '_' + request.resource.data.language + '_' + request.resource.data.word
    )
  );
```

- [ ] **Step 2: Deploy manually and confirm**

This is a manual, human-run step — `firestore.rules` is not touched by CI (`.github/workflows/deploy.yml` only runs `typecheck`/`test` and deploys application code). Ask the human partner to run `firebase deploy --only firestore:rules` and confirm success before this task is marked done. **Do not proceed to Task 5 until this is confirmed live** — Task 5's code starts writing the new-shape word ID, which the *old* rule alone would reject.

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat: accept both old and new word-ID shapes during the v3 word-ID migration"
```

---

### Task 5: `bookService.addBook` — language field + new word-ID scheme

**Files:**
- Modify: `lib/books/bookService.ts`
- Modify: `app/api/books/route.ts` (pass the temporary hardcoded language)
- Test: `lib/books/bookService.test.ts` (extend existing file)

**Interfaces:**
- Consumes: `buildWordId(userId, language, word)` (Task 2).
- Produces: `AddBookInput` gains a required `language: string` field; the created `books` doc gains `language: string` and `source: 'uploaded'`; every created `words` doc gains a `language: string` field and uses the new ID scheme.

- [ ] **Step 1: Write failing tests**

```ts
test('addBook stores language on the book doc and words', async () => {
  const { bookId } = await addBook({ title: 'T', format: 'text', rawText: 'hello world', userId: 'u1', language: 'english' });
  // assert the mocked books doc has { language: 'english', source: 'uploaded' }
  // assert a created word doc's id is buildWordId('u1', 'english', '<word>') and has { language: 'english' }
});

test('addBook keeps the same spelling separate across two languages for the same user', async () => {
  await addBook({ title: 'A', format: 'text', rawText: 'chat chat chat', userId: 'u1', language: 'english' });
  await addBook({ title: 'B', format: 'text', rawText: 'chat chat chat', userId: 'u1', language: 'french' });
  // assert two distinct word docs exist: u1_english_chat and u1_french_chat
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- bookService`
Expected: FAIL — `language` not accepted by `AddBookInput` / word IDs still use the old scheme.

- [ ] **Step 3: Implement**

Add `language: string` to `AddBookInput`; stamp `language` and `source: 'uploaded'` onto the `books.add(...)` call; change `newWordDoc` to accept and store `language`, and change the `wordIds` computation from `` `${userId}_${word}` `` to `buildWordId(userId, language, word)`. In `app/api/books/route.ts`, pass `language: 'english'` as a hardcoded literal at the `addBook({...})` call site, with a one-line comment that this is temporary until real detection lands in a later plan.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- bookService`
Expected: PASS, and all pre-existing `bookService.test.ts` tests still pass (they'll need `language: 'english'` added to their existing `addBook` call fixtures — update those call sites, not their assertions).

- [ ] **Step 5: Commit**

```bash
git add lib/books/bookService.ts app/api/books/route.ts lib/books/bookService.test.ts
git commit -m "feat: scope word documents by language"
```

---

### Task 6: `lookup` route — language-aware wordId, threaded from the reader

**Files:**
- Modify: `app/api/words/lookup/route.ts`
- Modify: `components/WordPopup.tsx`
- Modify: `app/book/[id]/read/[sectionNumber]/page.tsx`
- Test: `app/api/words/lookup/route.test.ts` (extend existing file), `components/WordPopup.test.tsx` (extend existing file)

**Interfaces:**
- Consumes: `buildWordId` (Task 2).
- Produces: the lookup route's request body gains a required `language: string`; `WordPopup` gains a required `language: string` prop.

- [ ] **Step 1: Write failing tests**

```ts
// route test
test('lookup builds the wordId using the given language', async () => {
  // POST { word: 'chat', add: true, language: 'french' }
  // assert the created/read doc id is buildWordId(uid, 'french', 'chat')
});

// WordPopup test
test('WordPopup sends the language prop in the lookup request body', async () => {
  render(<WordPopup word="chat" language="french" />);
  // click to open, assert fetch was called with body containing language: 'french'
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- lookup WordPopup`
Expected: FAIL — route still uses `${uid}_${word}`; `WordPopup` has no `language` prop.

- [ ] **Step 3: Implement**

In the route: parse `language` from the body (string, required — 400 if missing/non-string, mirroring the existing `word` validation); build `wordId` via `buildWordId(user.uid, language, word)`; store `language` on a newly-created word doc. In `WordPopup`: add `language: string` to its props, include it in both `runLookup` fetch bodies. In the read page: add `language: string` to the `BookData` type read from Firestore, and pass `language={bookData.language}` to every `<WordPopup word={word} language={bookData.language} />` call.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- lookup WordPopup`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/words/lookup/route.ts components/WordPopup.tsx app/book/[id]/read/[sectionNumber]/page.tsx app/api/words/lookup/route.test.ts components/WordPopup.test.tsx
git commit -m "feat: thread language through word lookup and the reader"
```

---

### Task 7: Per-user recognition threshold in `maybeUnlockNextSection`

**Files:**
- Modify: `lib/sections/sectionService.ts`
- Test: `lib/sections/sectionService.test.ts` (extend existing file)

**Interfaces:**
- Consumes: `getUserProfile(userId)` (Task 3).
- Produces: `maybeUnlockNextSection(bookId: string, sectionId: string): Promise<void>` — signature unchanged; no caller (`app/api/words/[wordId]/rate/route.ts`, `app/book/[id]/practice/[sectionNumber]/page.tsx`) needs to change.

- [ ] **Step 1: Write failing tests**

```ts
test('a user with a custom 100% threshold stays locked at 90% recognition', async () => {
  // mock: book doc userId: 'u1'; users/u1 profile: { recognitionThreshold: 1.0 };
  // section words: 9/10 recognized (0.9 rate)
  await maybeUnlockNextSection('book1', 'section1');
  // assert section1 status is still 'ready_to_practice', unchanged
});

test('a user with no profile doc still unlocks at the 80% default', async () => {
  // mock: book doc userId: 'u2'; no users/u2 doc at all; 8/10 recognized (0.8 rate)
  await maybeUnlockNextSection('book2', 'section2');
  // assert section2 status became 'ready_to_read'
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- sectionService`
Expected: FAIL — the first test unlocks incorrectly (hardcoded 0.8 passes 0.9), since the custom threshold is ignored.

- [ ] **Step 3: Implement**

Remove the `UNLOCK_THRESHOLD = 0.8` module constant. Inside `maybeUnlockNextSection`, after loading `sectionData` but before computing the rate, fetch the owning book's `userId` (`db.collection('books').doc(bookId).get()`, reading its `userId` field — throw if the book doc is missing, consistent with the existing "throw if section doc missing" behavior above it), then call `const { recognitionThreshold } = await getUserProfile(userId)`. Replace the `rate < UNLOCK_THRESHOLD` comparison with `rate < recognitionThreshold`.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- sectionService`
Expected: PASS, and all pre-existing tests in this file still pass (they implicitly rely on the 0.8 default, which still applies when no profile doc exists).

- [ ] **Step 5: Commit**

```bash
git add lib/sections/sectionService.ts lib/sections/sectionService.test.ts
git commit -m "feat: read the recognition-rate gate threshold per user"
```

---

### Task 8: `firestore.rules` — tighten to the new scheme only

**Files:**
- Modify: `firestore.rules`

**Interfaces:**
- None.

- [ ] **Step 1: Confirm nothing writes the old scheme any more**

Grep the codebase for `` `${userId}_${word}` `` / `` `${uid}_${word}` ``-style string construction outside of this plan's own git history; confirm Tasks 5 and 6 were the only two call sites and both now use `buildWordId`. This is a verification step, not a code change — if anything else is found, stop and fix it before proceeding.

Run: `grep -rn '\${.*}_\${word}' --include='*.ts' --include='*.tsx' lib app`
Expected: no matches outside of comments/tests describing the *old* behavior for context.

- [ ] **Step 2: Tighten the rule**

Replace the overlap condition from Task 4 with the new-scheme-only check:

```
allow create: if request.auth != null &&
  request.resource.data.userId == request.auth.uid &&
  request.resource.data.language is string &&
  wordId == request.auth.uid + '_' + request.resource.data.language + '_' + request.resource.data.word;
```

- [ ] **Step 3: Deploy manually and confirm**

Ask the human partner to run `firebase deploy --only firestore:rules` again and confirm success. This step should only happen once Tasks 5–7 are merged and deployed via CI (so no live code path is still attempting the old-scheme write when this lands).

- [ ] **Step 4: Commit**

```bash
git add firestore.rules
git commit -m "feat: require the language-scoped word-ID shape"
```

---

## Self-Review Notes

- **Spec coverage:** multi-language word-ID scheme (Task 5/6), diacritic normalization (Task 1), `users/{uid}` profile with defaults (Task 3), per-user recognition threshold replacing the hardcoded 80% (Task 7), rollout sequencing given manual rules deploys (Tasks 4 & 8) — all covered. Language *detection* and the Settings UI itself are explicitly deferred to later plans per the Global Constraints.
- **Type consistency:** `UserProfile.recognitionThreshold` (fraction 0–1) is the type `sectionService.ts` consumes directly — no percentage/fraction mismatch introduced. `buildWordId`'s signature is identical everywhere it's called (Tasks 5, 6).
- **Proportion:** 8 tasks for a data-model-only plan with no UI changes is appropriately small relative to the spec sections it covers.
