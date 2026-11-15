# WordBook v3 Plan 2: Bookshelf/Practice/Statistics Tabs + Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current two-link header nav + `/library` + `/review` pages with the three-tab Bookshelf/Practice/Statistics structure plus a gear-icon Settings page, built on Plan 1's language field and user-profile model.

**Architecture:** A persistent bottom `TabBar` plus a slim top bar (gear only) wrap every page via `app/layout.tsx`. Bookshelf (new home route) replaces `/library`. Practice becomes a per-book combined queue (due words + the next locked section's full word set) via a new service function, reusing the existing `Flashcard`/`PracticeSession`/rate-route machinery untouched. Statistics is a new read-only aggregation grouped by language. Settings becomes a real form backed by a new API route and `updateUserProfile` from Plan 1.

**Tech Stack:** Next.js 15 (App Router) + TypeScript 5, Firebase Admin SDK (Firestore + Storage), Tailwind CSS 3, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-15-wordbook-v3-design.md`

## Global Constraints

- Admin-SDK-only: every new Firestore/Storage read or write goes through a Server Component or API route, filtered by the authenticated uid — never from a client component directly.
- The global `/review` page is confirmed removed; no merged cross-book due-word view exists in this version.
- Recognition threshold is edited in the UI as a 50%–100% integer percentage but stored as a 0–1 fraction (Plan 1's `UserProfile.recognitionThreshold`) — the Settings API route is where that conversion and clamping happens.
- A book "mastered" word = most recent rating is `'good'` or `'easy'` (same signal the section gate already uses), counted per language.
- The "Generate a book" entry point is explicitly **not** part of this plan — Plan 4 (AI story generation) adds it. This plan's Bookshelf only gets the existing upload flow, relabeled.
- `AGENTS.md`'s directory-map convention (Server Components doing data fetching, API routes for mutations) is kept as-is; this plan does not introduce a client-side data-fetching library.

## Review Focus

- A user with books in more than one language must see the Bookshelf's language filter correctly scope the list — and "All" must still show everything.
- The Practice tab's combined queue must never due-date-filter the words of a section that's still unlocking (the existing sharp edge in `AGENTS.md`, now re-implemented in a new code path) — a section with a word rated "again" yesterday must still show that word today even though its `nextReviewDate` isn't due yet.
- A book whose next section has zero vocabulary words must still be practiceable-through on the new Practice tab (the existing zero-word-section edge case, re-implemented outside the original per-section practice page).
- Setting `recognitionThreshold` to an out-of-range value (e.g. `0` or `150`) via the Settings API route must be rejected or clamped, not stored as-is and silently defeat the gate.
- A user who has never visited Settings (no profile doc) must see the Bookshelf, Practice, and Statistics tabs all render correctly with sane defaults — none of this plan's new reads may throw on a missing `users/{uid}` doc (Plan 1's `getUserProfile` already guarantees this; this plan's job is to not bypass it with a raw Firestore read instead).

---

## File Structure

- Create: `components/TabBar.tsx` — bottom 3-tab nav
- Modify: `components/HeaderNav.tsx` — slim top bar, gear link only
- Modify: `middleware.ts` — protected-route prefixes
- Modify: `app/layout.tsx` — render `TabBar` + theme attribute, read profile server-side
- Create: `app/bookshelf/page.tsx` (replaces `app/library/page.tsx`, which is deleted)
- Modify: `app/page.tsx` — redirect to `/bookshelf`
- Create: `lib/sections/practiceQueue.ts` — `getPracticeQueueForBook`
- Create: `app/practice/page.tsx`, `app/practice/[bookId]/page.tsx`
- Create: `lib/stats/statsService.ts` — `getStatisticsByLanguage`
- Create: `app/statistics/page.tsx`
- Create: `app/api/settings/route.ts` (PATCH), `app/api/settings/avatar/route.ts` (POST)
- Modify: `storage.rules` — add `avatars/{userId}/{fileName}`
- Create: `components/SettingsForm.tsx`; rewrite `app/settings/page.tsx`
- Delete: `app/review/page.tsx`, `app/library/page.tsx`

---

### Task 1: Nav shell — `TabBar`, slim `HeaderNav`, middleware, layout wiring

**Files:**
- Create: `components/TabBar.tsx`
- Modify: `components/HeaderNav.tsx`
- Modify: `middleware.ts`
- Modify: `app/layout.tsx`
- Test: `components/TabBar.test.tsx`, `components/HeaderNav.test.tsx` (extend existing)

**Interfaces:**
- Produces: `export function TabBar(): JSX.Element` — three links (`/bookshelf`, `/practice`, `/statistics`), active tab styled via `usePathname()` (client component). `HeaderNav` keeps its name/export but renders only a gear link to `/settings` (drops the Library/Review/Settings text links).

- [ ] **Step 1: Write failing tests**

```tsx
test('TabBar marks the current route as active', () => {
  // mock usePathname -> '/practice'
  render(<TabBar />);
  expect(screen.getByRole('link', { name: /practice/i })).toHaveAttribute('aria-current', 'page');
});

test('HeaderNav renders a settings link and no Library/Review text links', () => {
  render(<HeaderNav />);
  expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
  expect(screen.queryByRole('link', { name: /library/i })).toBeNull();
  expect(screen.queryByRole('link', { name: /review/i })).toBeNull();
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- TabBar HeaderNav`
Expected: FAIL — `TabBar` doesn't exist; `HeaderNav` still renders the old three text links.

- [ ] **Step 3: Implement**

`TabBar` is a `'use client'` component using `next/navigation`'s `usePathname`, three `<Link>`s with labels Bookshelf/Practice/Statistics, `aria-current="page"` on the active one. `HeaderNav` drops to a single gear-icon `<Link href="/settings">` (keep it a Server Component — no client state needed). In `middleware.ts`, change `PROTECTED_PREFIXES` to `['/bookshelf', '/book', '/practice', '/statistics', '/settings']` (drop `/library` and `/review`). In `app/layout.tsx`, render `<HeaderNav />{children}<TabBar />` (`TabBar` after `children` so it behaves as a fixed bottom bar via its own CSS — exact positioning is a styling detail, not an interface decision).

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- TabBar HeaderNav`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/TabBar.tsx components/HeaderNav.tsx middleware.ts app/layout.tsx components/TabBar.test.tsx components/HeaderNav.test.tsx
git commit -m "feat: replace header nav with bottom tab bar"
```

---

### Task 2: Bookshelf page (replaces Library)

**Files:**
- Create: `app/bookshelf/page.tsx`
- Delete: `app/library/page.tsx`
- Modify: `app/page.tsx`
- Test: `app/bookshelf/page.test.tsx` (new, following the existing Server Component page test style if one exists for `library/page.tsx`; otherwise a lightweight render test is acceptable here since this page is almost pure data-to-markup)

**Interfaces:**
- Consumes: `books.language` (Plan 1), existing `AddBookForm`.
- Produces: nothing new consumed by later tasks — this page is a leaf.

- [ ] **Step 1: Write failing test**

```tsx
test('Bookshelf groups books by language and "All" shows every book', async () => {
  // mock books query returning [{ id, title, language: 'english' }, { id, title, language: 'spanish' }]
  // render, assert both titles visible under "All"; clicking "Spanish" chip hides the English one
});
```

- [ ] **Step 2: Run test, confirm it fails**

Run: `npm test -- bookshelf`
Expected: FAIL — page doesn't exist yet.

- [ ] **Step 3: Implement**

Port `app/library/page.tsx`'s query (`books` where `userId == uid`, order by `createdAt desc`) into `app/bookshelf/page.tsx`, adding `language` to the fetched fields. Render a row of language filter chips derived from the distinct languages present in the user's books (plus an always-present "All"); filtering is client-side over the already-fetched list (a small `'use client'` child component, e.g. `components/BookshelfList.tsx`, holding the selected-chip state — the page itself stays a Server Component that fetches once). Each book card shows title, language, and a progress indicator ("N of M sections unlocked", computed from a `sections` count query per book — acceptable here; Plan 5 revisits performance). Reuse `<AddBookForm />` unchanged for the upload path. Update `app/page.tsx` to `redirect('/bookshelf')`.

- [ ] **Step 4: Run test, confirm it passes**

Run: `npm test -- bookshelf`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/bookshelf app/page.tsx app/library
git commit -m "feat: replace Library page with Bookshelf"
```

---

### Task 3: Practice queue service

**Files:**
- Create: `lib/sections/practiceQueue.ts`
- Test: `lib/sections/practiceQueue.test.ts`

**Interfaces:**
- Consumes: `FlashcardWord` type from `components/Flashcard.tsx` (existing).
- Produces: `export async function getPracticeQueueForBook(userId: string, bookId: string): Promise<FlashcardWord[]>` — consumed by Task 4.

- [ ] **Step 1: Write failing tests**

```ts
test('includes every word of the next ready_to_practice section regardless of due date', async () => {
  // section (ready_to_practice) has 3 wordIds; one has nextReviewDate in the future
  // all 3 must appear in the result
});

test('includes due, previously-rated words linked to this book even from already-unlocked sections', async () => {
  // a word with lastRating set and nextReviewDate <= today, sectionRefs including this bookId
  // must appear; a word with nextReviewDate in the future must not
});

test('de-duplicates a word that is both due and part of the unlocking section', async () => {
  // same wordId satisfies both conditions -> appears exactly once
});

test('returns an empty array when the book has no unlocking section and nothing is due', async () => {});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- practiceQueue`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

Query the book's `sections` for the first one with `status == 'ready_to_practice'` (ordered by `sectionNumber`); collect its `wordIds` in full, no due-date filter (mirrors `app/book/[id]/practice/[sectionNumber]/page.tsx`'s existing rule). Separately, query `words` where `userId == userId`, `nextReviewDate <= today`, in-memory-filtered to `lastRating !== null && sectionRefs.some(r => r.bookId === bookId)` (mirrors the removed `/review` page's query shape, scoped to one book — Firestore can't filter the `sectionRefs` array-of-objects by `bookId` alone server-side). Merge both word-id lists, de-duplicate, fetch each word doc once, map to `FlashcardWord`. Order: due words first, then the unlocking section's not-yet-due words — this ordering is this plan's own call, not spec-mandated.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- practiceQueue`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/sections/practiceQueue.ts lib/sections/practiceQueue.test.ts
git commit -m "feat: add combined per-book practice queue"
```

---

### Task 4: Practice tab pages

**Files:**
- Create: `app/practice/page.tsx`
- Create: `app/practice/[bookId]/page.tsx`
- Test: `app/practice/page.test.tsx`, `app/practice/[bookId]/page.test.tsx`

**Interfaces:**
- Consumes: `getPracticeQueueForBook` (Task 3), `maybeUnlockNextSection` (Plan 1, unchanged signature), existing `PracticeSession` component (unchanged).

- [ ] **Step 1: Write failing tests**

```tsx
test('Practice tab lists every book with its due/practice count and a Practice button', async () => {});
test('a book with nothing due and no unlocking section shows "Read instead" instead of a dead Practice button', async () => {});
test('visiting /practice/[bookId] with a zero-word unlocking section runs the unlock check and redirects back to /practice', async () => {});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- practice`
Expected: FAIL — routes don't exist.

- [ ] **Step 3: Implement**

`app/practice/page.tsx`: list every book (`userId == uid`); for each, compute a small due/unlocking count (reuse the same two queries `practiceQueue.ts` already runs, or call `getPracticeQueueForBook` and take `.length` — simplest: call it directly and show `words.length`); render a "Practice" button linking to `/practice/[bookId]` when `words.length > 0`, otherwise a disabled/greyed "Read instead" linking to the book detail page. `app/practice/[bookId]/page.tsx`: mirrors the C1 zero-word handling already in `app/book/[id]/practice/[sectionNumber]/page.tsx` — if the queue is empty *and* there's an unlocking section with zero `wordIds`, call `maybeUnlockNextSection` directly, then redirect to `/practice`; otherwise render `<PracticeSession words={queue} doneHref="/practice" .../>` unchanged.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- practice`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/practice
git commit -m "feat: add Practice tab"
```

---

### Task 5: Statistics service + page

**Files:**
- Create: `lib/stats/statsService.ts`
- Create: `app/statistics/page.tsx`
- Test: `lib/stats/statsService.test.ts`, `app/statistics/page.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export type LanguageStats = {
    language: string;
    wordsMastered: number;
    books: { id: string; title: string; completedSections: number; totalSections: number }[];
  };
  export async function getStatisticsByLanguage(userId: string): Promise<LanguageStats[]>;
  ```

- [ ] **Step 1: Write failing tests**

```ts
test('groups mastered-word counts by language', async () => {
  // words: [{language:'english', lastRating:'good'}, {language:'english', lastRating:null}, {language:'spanish', lastRating:'easy'}]
  // expect english.wordsMastered === 1, spanish.wordsMastered === 1
});
test('reports per-book section completion within each language', async () => {
  // book (language: 'english', 4 sections, 2 completed) -> completedSections: 2, totalSections: 4
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- statsService`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

Query `words` where `userId == userId` (all languages); group in memory by `language`, count `lastRating === 'good' || lastRating === 'easy'`. Query `books` where `userId == userId`; group by `language`; for each book, fetch its `sections` and count `status === 'completed'` vs. total length. Assemble into `LanguageStats[]`. The page renders a language-switcher (one language's stats at a time, per the design doc) reusing the Bookshelf chip pattern from Task 2 if convenient, otherwise a simple tab-like row — presentational detail, not an interface decision.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- statsService`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/stats app/statistics
git commit -m "feat: add Statistics tab"
```

---

### Task 6: Settings API route

**Files:**
- Create: `app/api/settings/route.ts`
- Test: `app/api/settings/route.test.ts`

**Interfaces:**
- Consumes: `updateUserProfile`, `UserProfile` (Plan 1).
- Produces: `PATCH /api/settings` accepting `{ nativeLanguage?: string; theme?: 'light'|'dark'|'system'; recognitionThresholdPercent?: number }` (percent, 50–100 integer — the only place the percent↔fraction conversion happens).

- [ ] **Step 1: Write failing tests**

```ts
test('rejects a recognitionThresholdPercent below 50 or above 100', async () => {
  // PATCH { recognitionThresholdPercent: 10 } -> 400
  // PATCH { recognitionThresholdPercent: 150 } -> 400
});
test('converts a valid percent to a stored fraction', async () => {
  // PATCH { recognitionThresholdPercent: 90 } -> updateUserProfile called with { recognitionThreshold: 0.9 }
});
test('requires auth', async () => {
  // no session cookie -> 401
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- settings`
Expected: FAIL — route doesn't exist.

- [ ] **Step 3: Implement**

Validate `recognitionThresholdPercent` is an integer in `[50, 100]` when present (400 otherwise); validate `theme` is one of the three literal values when present; `nativeLanguage` accepted as any non-empty string when present (no fixed enum — the design doc doesn't name one). Build a `Partial<UserProfile>` from whatever fields were present (converting percent→fraction via `/ 100`), call `updateUserProfile(user.uid, partial)`.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- settings`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/settings/route.ts app/api/settings/route.test.ts
git commit -m "feat: add settings update API route"
```

---

### Task 7: Avatar upload route + storage rule

**Files:**
- Create: `app/api/settings/avatar/route.ts`
- Modify: `storage.rules`
- Test: `app/api/settings/avatar/route.test.ts`

**Interfaces:**
- Consumes: `updateUserProfile` (Plan 1).
- Produces: `POST /api/settings/avatar` (multipart, field `file`) — uploads to Storage, writes the resulting URL to `avatarUrl`.

- [ ] **Step 1: Write failing test**

```ts
test('uploads the file and stores its URL on the profile', async () => {
  // POST multipart with a small image file
  // assert Storage .save() was called at avatars/{uid}/<uuid> and updateUserProfile called with { avatarUrl: <matching url> }
});
```

- [ ] **Step 2: Run test, confirm it fails**

Run: `npm test -- avatar`
Expected: FAIL — route doesn't exist.

- [ ] **Step 3: Implement**

Mirror `app/api/books/route.ts`'s existing epub-upload pattern: `getStorage(getAdminApp()).bucket().file(\`avatars/${user.uid}/${randomUUID()}\`).save(buffer, { contentType: file.type })`, then `updateUserProfile(user.uid, { avatarUrl: <public or signed URL> })`. Add to `storage.rules`:

```
match /avatars/{userId}/{fileName} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

- [ ] **Step 4: Run test, confirm it passes**

Run: `npm test -- avatar`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/settings/avatar/route.ts storage.rules app/api/settings/avatar/route.test.ts
git commit -m "feat: add avatar upload"
```

(Manual step, not blocking the commit: ask the human partner to deploy `storage.rules` — same manual-deploy caveat as `firestore.rules`.)

---

### Task 8: Settings page UI

**Files:**
- Create: `components/SettingsForm.tsx`
- Modify: `app/settings/page.tsx`
- Test: `components/SettingsForm.test.tsx`

**Interfaces:**
- Consumes: `getUserProfile` (Plan 1, called server-side in the page), `/api/settings` and `/api/settings/avatar` (Tasks 6–7).

- [ ] **Step 1: Write failing tests**

```tsx
test('moving the threshold slider and saving PATCHes the percent value', async () => {});
test('shows the current nativeLanguage/theme/threshold as initial form state', async () => {});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- SettingsForm`
Expected: FAIL — component doesn't exist.

- [ ] **Step 3: Implement**

`app/settings/page.tsx` stays a Server Component: load `getAuthedUser()` + `getUserProfile(user.uid)` + the existing `getAuth().getUser()` email lookup, pass the profile as props to `<SettingsForm initialProfile={profile} />` (client component). `SettingsForm` holds local state for nativeLanguage (text input or select — no fixed language list exists yet in this plan, so a free-text input is acceptable), theme (3 buttons), recognitionThreshold (a range input, 50–100, labeled as a percent), and a file input for avatar; "Save" PATCHes `/api/settings` with the non-avatar fields, a separate "Change avatar" control POSTs to `/api/settings/avatar` immediately on file selection. Keep the existing `<SignOutButton />` at the bottom.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- SettingsForm`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/SettingsForm.tsx app/settings/page.tsx components/SettingsForm.test.tsx
git commit -m "feat: build out the Settings page"
```

---

### Task 9: Theme applied from the server

**Files:**
- Modify: `app/layout.tsx`
- Modify: `tailwind.config.ts` (enable class-based dark mode)
- Test: `app/layout.test.tsx` (new, or extend if one exists)

**Interfaces:**
- Consumes: `getAuthedUser` (existing), `getUserProfile` (Plan 1).

- [ ] **Step 1: Write failing test**

```tsx
test('root layout sets data-theme from the signed-in user\'s profile', async () => {
  // mock getAuthedUser -> { uid: 'u1' }, getUserProfile -> { theme: 'dark', ... }
  // assert rendered <html> has data-theme="dark"
});
test('a logged-out visitor gets no forced theme (defaults to system)', async () => {});
```

- [ ] **Step 2: Run test, confirm it fails**

Run: `npm test -- layout`
Expected: FAIL — `RootLayout` isn't async and doesn't read the profile yet.

- [ ] **Step 3: Implement**

Make `RootLayout` `async`; call `getAuthedUser()` (already safe when logged out — returns `null`) and, if present, `getUserProfile(user.uid)`; set `<html lang="en" data-theme={theme === 'system' ? undefined : theme}>`. In `tailwind.config.ts`, set `darkMode: ['class', '[data-theme="dark"]']` (or the project's existing dark-mode convention if any) so Tailwind's `dark:` utilities respond to the attribute. This plan wires the mechanism only — it does not re-skin every existing page for dark mode; that's a follow-on design pass, not required here.

- [ ] **Step 4: Run test, confirm it passes**

Run: `npm test -- layout`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx tailwind.config.ts app/layout.test.tsx
git commit -m "feat: apply the user's theme preference from the server"
```

---

### Task 10: Remove `/review`, confirm no dead links remain

**Files:**
- Delete: `app/review/page.tsx` (and its test file, if separate)
- Verify: no remaining reference to `/review` or `/library` anywhere in `app/`, `components/`

- [ ] **Step 1: Delete the route**

```bash
git rm app/review/page.tsx app/review/page.test.tsx
```

(adjust the second path if the existing test file is named/located differently — confirm with `ls app/review` first)

- [ ] **Step 2: Grep for dead references**

Run: `grep -rn "'/review'\|\"/review\"\|'/library'\|\"/library\"" app components`
Expected: no matches (Task 1 already removed the `HeaderNav` links; Task 2 already removed `/library`).

- [ ] **Step 3: Run the full test suite**

Run: `npm test && npm run typecheck`
Expected: PASS — nothing else imports the deleted page.

- [ ] **Step 4: Run the production build**

Run: `npm run build`
Expected: PASS (per `AGENTS.md`, this catches App-Router-specific issues `tsc`/`vitest` miss).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: remove the global review page, superseded by the Practice tab"
```

---

## Self-Review Notes

- **Spec coverage:** three tabs (Tasks 2, 4, 5), Settings including the now-configurable threshold (Tasks 6–9), removal of the old nav/`/review` (Tasks 1, 10) — all covered. The "Generate a book" entry point is intentionally deferred to Plan 4 per this plan's Global Constraints, not an oversight.
- **Type consistency:** `getPracticeQueueForBook` returns `FlashcardWord[]` (Task 3), consumed unchanged by `PracticeSession` (Task 4) — no new word-shape type introduced. `LanguageStats` (Task 5) is self-contained, not referenced elsewhere in this plan.
- **Proportion:** 10 tasks across three new tabs plus a real Settings page is proportionate — each task is one shippable surface.
