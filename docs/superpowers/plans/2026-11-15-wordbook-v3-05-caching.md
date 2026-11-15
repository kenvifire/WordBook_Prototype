# WordBook v3 Plan 5: Two-Level Caching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop re-querying Firestore for the same data on every page load, without changing any existing Server-Component page into a client-fetched one.

**Architecture:** A short-TTL in-process `Map`-based cache wraps the highest-traffic Admin SDK reads (user profile, a book's section list, a user's book list), invalidated explicitly by the specific writes that change that data. A small per-session client-side cache covers the one already-client lookup path (`WordPopup`'s word-definition fetch) that benefits from not re-fetching the same word twice in one browsing session.

**Tech Stack:** Next.js 15 (App Router) + TypeScript 5, Firebase Admin SDK, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-15-wordbook-v3-design.md`

## Global Constraints

- No Server Component page that reads via the Admin SDK today is converted into a client-fetched page — the cache sits *underneath* `getFirestore(getAdminApp())` calls, not in front of a new data-fetching layer.
- Every cache entry is scoped by the acting user's uid (and, where relevant, bookId) in its key — never a cache key that could leak one user's cached data to another's request.
- Cache entries are invalidated by the specific write that changes them, not by a blanket flush-everything-on-any-write approach.
- This plan runs last, after Plans 1–4, since it wraps functions those plans already created (`getUserProfile`, the Bookshelf's book-list query, the Book Detail/Practice/Statistics section queries).

## Review Focus

- Rating a word that unlocks a section must make the Book Detail page's *next* load reflect the new `ready_to_read` status immediately — a stale cached section list would otherwise show the old `locked`/`ready_to_practice` state for up to the TTL window.
- Changing the recognition threshold in Settings must make the *next* rated word's unlock check use the new threshold immediately, not a cached stale one — this is the single highest-value cache target (`getUserProfile` is called on every rating) and also the easiest to get wrong.
- Two different users' cached profiles/book lists must never collide — a cache key built incorrectly (e.g. omitting the uid) would leak one user's data into another's response.
- A cache lookup on a cold key (first request after server start, or after a TTL expiry) must fall through to Firestore correctly, not throw or return `undefined` as if it were a valid cached value.
- The client-side `WordPopup` cache must be scoped per session (in-memory, not `localStorage`) — it must not resurrect a stale definition across a full page reload if the underlying word's definition changed server-side in the meantime (acceptable to re-fetch once per fresh page load, per the spec's own caching split between client/server levels).

---

## File Structure

- Create: `lib/cache/serverCache.ts`
- Modify: `lib/users/userProfile.ts` — wrap `getUserProfile`, invalidate from `updateUserProfile`
- Modify: `app/bookshelf/page.tsx` (or its underlying query helper) — wrap the book-list query, invalidate on `addBook`/`startGeneratingBook`
- Modify: `app/book/[id]/page.tsx` and/or a shared sections-query helper — wrap the section-list query, invalidate from `maybeUnlockNextSection` and `markSectionComplete`
- Create: `lib/cache/clientWordCache.ts`
- Modify: `components/WordPopup.tsx` — use the client cache

---

### Task 1: In-process server cache primitive

**Files:**
- Create: `lib/cache/serverCache.ts`
- Test: `lib/cache/serverCache.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export async function getOrSet<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T>;
  export function invalidate(key: string): void;
  export function invalidatePrefix(prefix: string): void; // for keys like `sections:${bookId}:*`
  ```

- [ ] **Step 1: Write failing tests**

```ts
test('getOrSet calls fn once and caches the result within the TTL', async () => {
  let calls = 0;
  const fn = async () => { calls++; return 'value'; };
  await getOrSet('k', 1000, fn);
  await getOrSet('k', 1000, fn);
  expect(calls).toBe(1);
});
test('getOrSet re-calls fn after the TTL expires', async () => {
  // use vi.useFakeTimers() / advance time past ttlMs, assert fn called again
});
test('invalidate forces the next getOrSet call to re-run fn', async () => {});
test('invalidatePrefix clears every key starting with the given prefix', async () => {});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- serverCache`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

A module-level `Map<string, { value: unknown; expiresAt: number }>`. `getOrSet`: if a non-expired entry exists for `key`, return its `value`; otherwise call `fn()`, store `{ value, expiresAt: Date.now() + ttlMs }`, return it. `invalidate`: `map.delete(key)`. `invalidatePrefix`: iterate `map.keys()`, delete every key starting with `prefix`.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- serverCache`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/cache/serverCache.ts lib/cache/serverCache.test.ts
git commit -m "feat: add in-process short-TTL cache primitive"
```

---

### Task 2: Cache `getUserProfile`, invalidate on `updateUserProfile`

**Files:**
- Modify: `lib/users/userProfile.ts`
- Test: `lib/users/userProfile.test.ts` (extend existing file)

**Interfaces:**
- Consumes: `getOrSet`/`invalidate` (Task 1).
- Produces: `getUserProfile`/`updateUserProfile` signatures unchanged — every existing caller (Plan 1's `sectionService.ts`, Plan 2's Settings route and layout, Plan 4's `generateBook.ts`) needs no changes at all.

- [ ] **Step 1: Write failing tests**

```ts
test('a second getUserProfile call for the same uid does not re-query Firestore', async () => {
  // spy on the mocked users/{uid}.get(); call getUserProfile twice, assert .get() called once
});
test('updateUserProfile invalidates the cached profile so the next getUserProfile reflects the change', async () => {
  await getUserProfile('u1'); // warms the cache with defaults
  await updateUserProfile('u1', { recognitionThreshold: 1.0 });
  const profile = await getUserProfile('u1');
  expect(profile.recognitionThreshold).toBe(1.0); // not the stale cached 0.8
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- userProfile`
Expected: FAIL — the first test's second call still hits the mocked `.get()`; both pass today only by coincidence of not checking call counts, so this is a genuinely new assertion, not a regression check.

- [ ] **Step 3: Implement**

Wrap `getUserProfile`'s body in `getOrSet(\`profile:${userId}\`, 30_000, async () => { ...today's logic... })` (30s TTL — short enough that a stale threshold is never live for long, long enough to absorb repeated reads within one page render). In `updateUserProfile`, after the `.set(..., { merge: true })` succeeds, call `invalidate(\`profile:${userId}\`)`.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- userProfile`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/users/userProfile.ts lib/users/userProfile.test.ts
git commit -m "feat: cache user profile reads"
```

---

### Task 3: Cache the Bookshelf's book-list query

**Files:**
- Create: `lib/books/listBooks.ts` (extracted from `app/bookshelf/page.tsx`'s inline query, so it has a single, cacheable call site)
- Modify: `app/bookshelf/page.tsx` — call the new helper
- Modify: `lib/books/bookService.ts` — invalidate from `addBook`
- Modify: `lib/books/generateBook.ts` — invalidate from `startGeneratingBook`
- Test: `lib/books/listBooks.test.ts`

**Interfaces:**
- Produces: `export async function listBooks(userId: string): Promise<BookSummary[]>` (the same shape `app/bookshelf/page.tsx` already builds — move the type and the query here verbatim, don't redesign it).

- [ ] **Step 1: Write failing tests**

```ts
test('a second listBooks call for the same uid does not re-query Firestore', async () => {});
test('addBook invalidates the cached list so a newly uploaded book appears on the next call', async () => {});
test('startGeneratingBook invalidates the cached list so the new pending book appears immediately', async () => {});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- listBooks`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

Move the existing `books` query (and its `BookSummary`-shaped mapping) out of `app/bookshelf/page.tsx` into `listBooks(userId)`, wrapped in `getOrSet(\`books:${userId}\`, 15_000, ...)`. Call `invalidate(\`books:${userId}\`)` at the end of `addBook` (after the book doc is created — for uploads, this is right after the book doc write, before/regardless of the Plan 3 deferred-sectioning step, since the book already needs to appear on the shelf before sectioning is chosen) and at the start of `startGeneratingBook` (right after creating the `pending` book doc).

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- listBooks`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/books/listBooks.ts app/bookshelf/page.tsx lib/books/bookService.ts lib/books/generateBook.ts lib/books/listBooks.test.ts
git commit -m "feat: cache the Bookshelf's book list"
```

---

### Task 4: Cache a book's section list

**Files:**
- Create: `lib/sections/listSections.ts`
- Modify: `app/book/[id]/page.tsx` — call the new helper
- Modify: `lib/sections/sectionService.ts` — invalidate from `maybeUnlockNextSection`
- Modify: `app/book/[id]/read/[sectionNumber]/page.tsx` — invalidate from `markSectionComplete`
- Modify: `lib/books/bookService.ts` — invalidate (pre-emptively empty, cheap) after `finalizeSectioning` creates sections
- Test: `lib/sections/listSections.test.ts`

**Interfaces:**
- Produces: `export async function listSections(bookId: string): Promise<SectionSummary[]>` (same shape as `app/book/[id]/page.tsx`'s existing `Section` type/query).

- [ ] **Step 1: Write failing tests**

```ts
test('a second listSections call for the same bookId does not re-query Firestore', async () => {});
test('maybeUnlockNextSection invalidates the cached list for that book', async () => {
  // warm the cache, call maybeUnlockNextSection to unlock a section, call listSections again,
  // assert the returned status reflects the unlock, not the stale cached value
});
test('markSectionComplete invalidates the cached list for that book', async () => {});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- listSections`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

Move `app/book/[id]/page.tsx`'s existing `sections` query into `listSections(bookId)`, wrapped in `getOrSet(\`sections:${bookId}\`, 15_000, ...)`. Call `invalidate(\`sections:${bookId}\`)` at the end of `maybeUnlockNextSection` (after either the current section's or the next section's status write — simplest correct choice: invalidate unconditionally whenever this function returns, even on its early-return paths that changed nothing, since an unnecessary invalidation is harmless and the alternative is tracking exactly which branch wrote something) and inside `markSectionComplete`'s server action in the read page, right after its own `.update({ status: 'completed' })`.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- listSections`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/sections/listSections.ts app/book/[id]/page.tsx lib/sections/sectionService.ts app/book/[id]/read/[sectionNumber]/page.tsx lib/sections/listSections.test.ts
git commit -m "feat: cache a book's section list"
```

---

### Task 5: Client-side cache for `WordPopup` lookups

**Files:**
- Create: `lib/cache/clientWordCache.ts`
- Modify: `components/WordPopup.tsx`
- Test: `lib/cache/clientWordCache.test.ts`, extend `components/WordPopup.test.tsx`

**Interfaces:**
- Produces: `export function getCachedDefinition(key: string): string | null | undefined` (`undefined` = not cached yet, distinct from a cached-but-null definition), `export function setCachedDefinition(key: string, definition: string | null): void`. `key` is `` `${language}:${word}` `` so the same spelling in two languages never collides.

- [ ] **Step 1: Write failing tests**

```ts
test('round-trips a cached definition, distinguishing "not cached" from "cached as null"', () => {
  expect(getCachedDefinition('english:chat')).toBeUndefined();
  setCachedDefinition('english:chat', null);
  expect(getCachedDefinition('english:chat')).toBeNull();
});
test('WordPopup does not re-fetch a word it already looked up this session', async () => {
  render(<WordPopup word="chat" language="english" />);
  // click to open, click close, click to open again — assert fetch called exactly once
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- clientWordCache WordPopup`
Expected: FAIL — module doesn't exist; `WordPopup` still re-fetches every open.

- [ ] **Step 3: Implement**

A plain module-level `Map<string, string | null>` (in-memory only, intentionally not `localStorage` — Global Constraints: must not survive a full reload). In `WordPopup`'s `handleWordClick`, check `getCachedDefinition(\`${language}:${word}\`)` before calling `runLookup(false)`; if it's not `undefined`, use it directly instead of fetching. In `runLookup`, after a successful response, call `setCachedDefinition` with the result.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- clientWordCache WordPopup`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/cache/clientWordCache.ts components/WordPopup.tsx lib/cache/clientWordCache.test.ts components/WordPopup.test.tsx
git commit -m "feat: cache word-popup lookups for the current session"
```

---

### Task 6: Verify route prefetching, full verification pass

**Files:**
- None expected to change — this task is verification, falling back to a fix only if something's actually broken.

- [ ] **Step 1: Confirm `TabBar`'s links use `next/link`, not a manual navigation handler**

Read `components/TabBar.tsx` (Plan 2); `<Link>` prefetches its target route by default in the App Router. If any tab link was implemented as a `<button onClick={() => router.push(...)}>` instead, convert it to `<Link>` — that's the only way this requirement is satisfied; there's no separate prefetch API to call.

- [ ] **Step 2: Run the full test suite**

Run: `npm test && npm run typecheck`
Expected: PASS

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Manually verify the two Review Focus scenarios that need a running server**

Rate a word that unlocks a section, then reload the Book Detail page — confirm the new status shows immediately. Change the recognition threshold in Settings, then rate a word — confirm the new threshold is the one applied, not a stale cached one.

- [ ] **Step 5: Commit (only if Step 1 required a change)**

```bash
git add components/TabBar.tsx
git commit -m "fix: ensure tab navigation uses Link for built-in prefetching"
```

---

## Self-Review Notes

- **Spec coverage:** server-side in-process cache (Tasks 1–4), client-side cache for already-client components (Task 5), built-in route prefetching (Task 6), explicit invalidation on the writes the spec calls out (rating a word, unlocking a section, adding/generating a book) — all covered. No Server Component page was converted to client-fetched, per the Global Constraints.
- **Type consistency:** `listBooks`/`listSections` return the exact same shapes their source pages already built inline — no new type introduced that the pages need to adapt to.
- **Proportion:** 6 small tasks, each wrapping one existing read/write pair — appropriately the smallest plan of the five, since caching is additive to code the other four plans already finished.
