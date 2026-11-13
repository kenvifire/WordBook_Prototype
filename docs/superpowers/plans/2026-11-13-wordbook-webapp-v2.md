# WordBook Web App (v2, Supabase-backed) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current local-JSON WordBook prototype with a brand-new, account-based, Supabase-backed web app that implements the full "practice before you unlock" reading flow from the spec: add a book (text or EPUB), split into 150-word sections, extract per-section vocabulary, practice via SM-2 flashcards, unlock sections at an 80% recognition rate, read with tap-to-define, and a global spaced-repetition review queue.

**Architecture:** Next.js 15 App Router + TypeScript, Supabase for Postgres + Auth + Storage (one service for all three), Tailwind CSS for styling, no external APIs requiring a paid key (free dictionary API, browser `speechSynthesis`). This replaces the prior prototype's code entirely — no old code, local-JSON store, or OpenAI/MyMemory integration is reused.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript 5, Tailwind CSS 3, `@supabase/supabase-js` + `@supabase/ssr`, `epub2` (EPUB parsing), Vitest 2 + Testing Library (existing test tooling, kept as-is).

**Spec:** `docs/web-app-prompt.md` — the full product brief. It is self-described as having "every decision needed to start building," so this plan does not revisit product scope; it only resolves the implementation-level gaps the spec leaves open (listed below) and breaks the build into tasks.

## Rulings (plan-author decisions the spec left open)

1. **`section_words` join table (new, additive).** The spec's `words` table has no section reference, but features 3/5/6 require knowing a section's member words and computing a per-section recognition rate. Added `section_words(section_id, word_id)` as a many-to-many join. Does not remove or contradict any column the spec specifies.
2. **Row Level Security.** The spec says every row is owned by `auth.users.id` but doesn't say to enforce it. A multi-user app with no RLS lets any authenticated user read/write any other user's rows via the client SDK — treated as a correctness requirement, not an extra. Every table gets RLS policies scoped to `auth.uid()`.
3. **EPUB library: `epub2`**, not `epubjs` (the spec offered either). `epubjs` targets browser rendering (DOM/Blob APIs); `epub2` is a plain Node parser, which is what a Next.js API route needs.
4. **Tailwind CSS v3**, not v4 — more stable tooling/docs; spec only says "Tailwind CSS," not a version.
5. **Supabase Storage usage.** The spec lists Storage as a reason to pick Supabase but the `books` table only stores flattened `raw_text`. Ruling: uploaded `.epub` files are saved to a `epubs` Storage bucket (for record-keeping / future re-parse) in addition to extracting `raw_text` at upload time; pasted/`.txt` text never touches Storage.
6. **Common-1000-words list source.** Sourced from the MIT-licensed `first20hours/google-10000-english` word-frequency list (first 1000 entries), documented in the bundled asset's neighboring README note.
7. **Recognition signal is global per word, not per attempt-in-section.** Per the spec's own `words` table (one row per `(user_id, word)` regardless of book), `last_rating` is global. A word already mastered via Book A instantly counts as recognized toward Book B's section gate the first time it appears there. This matches the spec's explicit dedup intent, not a new behavior.
8. **Old prototype removal.** Per user confirmation, the entire existing `app/`, `components/`, `lib/`, `scripts/`, `data/` trees (OpenAI/MyMemory/local-JSON prototype) are deleted in Task 1. `docs/business-tech-note.md` and `docs/runbook.md` describe the retired version and are left in place untouched as historical record, not updated — they are not part of this build.

## Global Constraints

- Stack: Next.js (App Router, TypeScript) + Supabase (Postgres, Auth, Storage) + Tailwind CSS, deployable to Vercel.
- Auth: Supabase Auth, email + password only. No social login.
- Monetization: none.
- Languages: English-content books only for v1.
- Book formats: plain text (paste or `.txt` upload) and `.epub` only. No PDF.
- Section size: fixed 150 words. Section N covers word-index `[(N-1)*150, N*150)` of the flattened book text. Not configurable.
- Vocabulary extraction: tokenize, lowercase, strip punctuation, dedupe, drop any word in the bundled top-1000-common-English-words list.
- Definitions: `GET https://api.dictionaryapi.dev/api/v2/entries/en/<word>`, no API key. A failed/not-found lookup stores the word with a null definition — never fails the section/book-add flow.
- Unlock threshold: fixed 80% recognition rate. Not configurable.
- SM-2 variant (exact, per spec — not textbook SM-2):
  - New word: `repetitions=0, interval=1, easeFactor=2.5`.
  - Again: `repetitions=0, interval=1, easeFactor=max(1.3, easeFactor-0.2)`.
  - Hard: `repetitions+=1, interval=round(interval*1.2), easeFactor=max(1.3, easeFactor-0.15)`.
  - Good: `repetitions+=1, interval=round(interval*easeFactor)`, easeFactor unchanged.
  - Easy: `repetitions+=1, interval=round(interval*easeFactor*1.3), easeFactor+=0.15`.
  - After every rating: `nextReviewDate = today + interval days`.
- Recognition rate for a section = `count(section's words whose last_rating ∈ {Good, Easy}) / count(section's words)`.
- Pronunciation: client-side `window.speechSynthesis` only. No external TTS, no API key.
- Pages: `/signup`, `/login`, `/library`, `/book/[id]`, `/book/[id]/practice/[sectionNumber]`, `/book/[id]/read/[sectionNumber]`, `/review`, `/settings`.
- Out of scope (do not build): PDF, non-English content, translation, payments, social login, offline/mobile app, configurable section size/threshold, admin/analytics dashboards, cloud TTS.
- Tests must not require a live Supabase project or network access — mock `@supabase/supabase-js` / `@supabase/ssr` clients and `fetch` in unit tests.
- Keep existing test tooling as configured: Vitest 2, jsdom, Testing Library, `@/*` → repo-root path alias (already set up in `tsconfig.json` / `vitest.config.ts` — do not change).

## Review Focus

1. **Cross-user data access.** A signed-in user must never read or write another user's `books`/`sections`/`words` rows. Covered by Task 2's RLS policy tests (two different `auth.uid()` values, one is denied).
2. **Short book (< 150 words).** A one-section book must extract vocabulary and become unlockable without crashing on an undersized final section. Covered by Task 3's sectionizer tests.
3. **Dictionary API failure mid-book.** One word's lookup failing (404, timeout, malformed response) must not abort extraction for the rest of the section's words. Covered by Task 5's dictionary client tests and Task 7's ingestion test.
4. **Corrupt/invalid EPUB upload.** Parsing a non-EPUB or truncated file must surface a clear error from the API route, not a 500 or a hung request. Covered by Task 6's parser tests and Task 7's ingestion-route test.
5. **Recognition-rate boundary and zero-vocabulary sections.** A section exactly at 79% vs 80%, and a section whose vocabulary extraction yields zero words (e.g., all common words), must not divide-by-zero and must resolve to the correct locked/unlocked state (zero-word section auto-passes). Covered by Task 9's recognition-rate tests.

---

## File Structure

Removed entirely: `app/`, `components/`, `lib/`, `scripts/`, `data/` (old prototype — OpenAI/MyMemory/local-JSON code, tests, and demo book).

Kept as-is: `tsconfig.json`, `vitest.config.ts`, `vitest.setup.ts`, `.gitignore` (updated), `docs/` (new plan added; existing docs untouched), `README.md` (rewritten in the final task).

New tree:

- `supabase/migrations/0001_init.sql` — schema + RLS policies (Task 1)
- `lib/supabase/client.ts` — browser Supabase client factory (Task 2)
- `lib/supabase/server.ts` — server-side Supabase client factory (cookies) (Task 2)
- `middleware.ts` — Supabase auth session refresh (Task 2)
- `app/login/page.tsx`, `app/signup/page.tsx` — auth forms (Task 2)
- `app/settings/page.tsx` — account info + sign-out (Task 2)
- `lib/text/sectionize.ts` — section splitting (Task 3)
- `lib/text/commonWords.json`, `lib/text/extractVocabulary.ts` — vocabulary extraction (Task 4)
- `lib/dictionary/dictionaryApi.ts` — definition lookup (Task 5)
- `lib/epub/parseEpub.ts` — EPUB → `{ title, author, text }` (Task 6)
- `lib/books/bookService.ts` — `addBook` (text/epub → book+sections+words+section_words rows) (Task 7)
- `app/api/books/route.ts` — POST add-book endpoint (Task 7)
- `lib/srs/sm2.ts` — rating → next SM-2 state (Task 8)
- `lib/sections/sectionService.ts` — recognition rate + unlock logic (Task 9)
- `app/library/page.tsx`, `components/AddBookForm.tsx` — library + add-book UI (Task 10)
- `app/book/[id]/page.tsx`, `components/SectionStatusBadge.tsx` — book detail (Task 11)
- `app/book/[id]/practice/[sectionNumber]/page.tsx`, `components/Flashcard.tsx`, `components/RatingButtons.tsx`, `components/SpeakButton.tsx`, `app/api/words/[wordId]/rate/route.ts` — practice flow (Task 12)
- `app/book/[id]/read/[sectionNumber]/page.tsx`, `components/WordPopup.tsx`, `app/api/words/lookup/route.ts` — reader + tap-to-define (Task 13)
- `app/review/page.tsx` — global due-word review (Task 14)
- `README.md` — rewritten; smoke test (Task 15)

---

### Task 1: Clean slate, scaffold, and database schema

**Files:**
- Delete: `app/`, `components/`, `lib/`, `scripts/`, `data/` (entire directories)
- Modify: `package.json` (rewrite dependencies/scripts), `.gitignore` (add `supabase/.temp`), `.env.local.example` (rewrite)
- Create: `supabase/migrations/0001_init.sql`
- Create: `app/layout.tsx`, `app/page.tsx` (redirect to `/library`), `app/globals.css` (Tailwind directives)
- Create: `tailwind.config.ts`, `postcss.config.mjs`

**Interfaces:**
- Produces: the `books`, `sections`, `words`, `section_words` tables and their RLS policies that every later task's services query against. Exact columns below — later tasks must use these names verbatim.

- [ ] **Step 1: Delete old prototype code**

```bash
git rm -r app components lib scripts data
```

- [ ] **Step 2: Rewrite `package.json`**

Keep `name`, `version`, `private`, `type: module`, and the existing `devDependencies` (`vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/*`, `typescript`, `@types/*`) and scripts `dev`/`build`/`start`/`test`/`typecheck` unchanged. Remove `tsx`/`seed:demo` (no seed script in this build). Add dependencies: `@supabase/supabase-js`, `@supabase/ssr`, `epub2`, `tailwindcss` (devDependency, v3), `postcss`, `autoprefixer`.

- [ ] **Step 3: Rewrite `.env.local.example`**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 4: Write the migration `supabase/migrations/0001_init.sql`**

Tables (exact columns):
```sql
create extension if not exists pgcrypto;

create table books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  author text,
  format text not null check (format in ('text', 'epub')),
  raw_text text not null,
  created_at timestamptz not null default now()
);

create table sections (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references books(id) on delete cascade,
  section_number int not null,
  start_word_index int not null,
  end_word_index int not null,
  status text not null default 'locked'
    check (status in ('locked', 'ready_to_practice', 'ready_to_read', 'completed')),
  unique (book_id, section_number)
);

create table words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word text not null,
  definition text,
  book_id uuid references books(id) on delete set null,
  repetitions int not null default 0,
  ease_factor numeric not null default 2.5,
  interval_days int not null default 1,
  next_review_date date not null default current_date,
  last_rating text check (last_rating in ('again', 'hard', 'good', 'easy')),
  created_at timestamptz not null default now(),
  unique (user_id, word)
);

create table section_words (
  section_id uuid not null references sections(id) on delete cascade,
  word_id uuid not null references words(id) on delete cascade,
  primary key (section_id, word_id)
);
```

RLS (every table):
```sql
alter table books enable row level security;
alter table sections enable row level security;
alter table words enable row level security;
alter table section_words enable row level security;

create policy "own books" on books for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own words" on words for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sections via owned book" on sections for all
  using (exists (select 1 from books where books.id = sections.book_id and books.user_id = auth.uid()))
  with check (exists (select 1 from books where books.id = sections.book_id and books.user_id = auth.uid()));
create policy "section_words via owned section" on section_words for all
  using (exists (select 1 from sections join books on books.id = sections.book_id
                 where sections.id = section_words.section_id and books.user_id = auth.uid()))
  with check (exists (select 1 from sections join books on books.id = sections.book_id
                       where sections.id = section_words.section_id and books.user_id = auth.uid()));
```

Storage bucket (for Task 7's EPUB upload):
```sql
insert into storage.buckets (id, name, public) values ('epubs', 'epubs', false)
on conflict (id) do nothing;
create policy "own epub uploads" on storage.objects for all
  using (bucket_id = 'epubs' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'epubs' and auth.uid()::text = (storage.foldername(name))[1]);
```

- [ ] **Step 5: Scaffold Tailwind + root layout**

`tailwind.config.ts` content paths covering `app/**/*.{ts,tsx}` and `components/**/*.{ts,tsx}`; `app/globals.css` with the three Tailwind directives; `app/layout.tsx` a minimal HTML shell importing `./globals.css`; `app/page.tsx` redirects (`redirect('/library')` from `next/navigation`) — `/library` doesn't exist yet, that's fine, it's built in Task 10.

- [ ] **Step 6: Install and verify**

Run: `npm install`
Expected: installs cleanly, no new test files yet so `npm test` reports "no tests found" (acceptable at this step only).

Run: `npm run typecheck`
Expected: passes (no old code referencing deleted modules remains).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: remove old prototype, scaffold Supabase/Tailwind Next.js app"
```

---

### Task 2: Auth (Supabase email/password) + session middleware + settings page

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `middleware.ts`
- Create: `app/login/page.tsx`, `app/signup/page.tsx`, `app/settings/page.tsx`
- Test: `lib/supabase/client.test.ts`

**Interfaces:**
- Consumes: `@supabase/ssr`'s `createBrowserClient`/`createServerClient`.
- Produces: `createClient()` in `lib/supabase/client.ts` (browser) and `createClient()` in `lib/supabase/server.ts` (server, reads `cookies()` from `next/headers`) — every later task that touches the database imports one of these two, by file path, never instantiates Supabase directly.

- [ ] **Step 1: Write the failing test for the browser client factory**

```ts
// lib/supabase/client.test.ts
import { describe, test, expect, vi } from 'vitest';
vi.mock('@supabase/ssr', () => ({ createBrowserClient: vi.fn(() => 'fake-client') }));
import { createClient } from './client';

test('createClient builds a browser client from NEXT_PUBLIC env vars', () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  expect(createClient()).toBe('fake-client');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/supabase/client.test.ts`
Expected: FAIL — `client.ts` not defined.

- [ ] **Step 3: Implement `lib/supabase/client.ts`**

```ts
export function createClient() // SupabaseClient
```
Body: `createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)` from `@supabase/ssr`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/supabase/client.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement `lib/supabase/server.ts`** (no test — thin wrapper over `next/headers`, exercised by the auth pages)

```ts
export async function createClient() // SupabaseClient, async because cookies() is async in Next 15
```
Body: `createServerClient(url, anonKey, { cookies: { getAll, setAll } })` per `@supabase/ssr`'s documented Next.js App Router pattern, backed by `cookies()` from `next/headers`.

- [ ] **Step 6: Implement `middleware.ts`**

Standard `@supabase/ssr` session-refresh middleware: calls `supabase.auth.getUser()` on every request so server components see a fresh session; matcher excludes `_next/static`, `_next/image`, and common static file extensions.

- [ ] **Step 7: Implement `app/signup/page.tsx` and `app/login/page.tsx`**

Each a client component (`'use client'`) with an email + password form calling `createClient().auth.signUp(...)` / `.signInWithPassword(...)`, redirecting to `/library` on success (`useRouter().push('/library')`) and showing the error message on failure.

- [ ] **Step 8: Implement `app/settings/page.tsx`**

Server component: fetches the current user via `lib/supabase/server.ts`, shows the email, and a "Sign out" form that posts to a server action calling `supabase.auth.signOut()` then redirects to `/login`.

- [ ] **Step 9: Run full test suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: all tests pass, no type errors.

- [ ] **Step 10: Commit**

```bash
git add lib/supabase middleware.ts app/login app/signup app/settings
git commit -m "feat: Supabase email/password auth, session middleware, settings page"
```

---

### Task 3: Text sectioning

**Files:**
- Create: `lib/text/sectionize.ts`
- Test: `lib/text/sectionize.test.ts`

**Interfaces:**
- Produces: `splitIntoSections(text: string): { sectionNumber: number; startWordIndex: number; endWordIndex: number; text: string }[]`, used by Task 7's `bookService.addBook`.

- [ ] **Step 1: Write failing tests**

```ts
test('splits text into 150-word sections, last section shorter', () => {
  const words = Array.from({ length: 320 }, (_, i) => `word${i}`);
  const sections = splitIntoSections(words.join(' '));
  expect(sections).toHaveLength(3);
  expect(sections[0]).toMatchObject({ sectionNumber: 1, startWordIndex: 0, endWordIndex: 150 });
  expect(sections[2]).toMatchObject({ sectionNumber: 3, startWordIndex: 300, endWordIndex: 320 });
  expect(sections[2].text.split(/\s+/)).toHaveLength(20);
});

test('a book shorter than 150 words is a single section', () => {
  const sections = splitIntoSections('one two three');
  expect(sections).toHaveLength(1);
  expect(sections[0]).toMatchObject({ sectionNumber: 1, startWordIndex: 0, endWordIndex: 3 });
});

test('empty text produces zero sections', () => {
  expect(splitIntoSections('')).toHaveLength(0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/text/sectionize.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `splitIntoSections(text: string)` in `lib/text/sectionize.ts`**

Split `text` on whitespace (`text.trim().split(/\s+/)`, filtering empty strings so `''` → `[]`), then chunk the word array into groups of 150, mapping each chunk to `{ sectionNumber, startWordIndex, endWordIndex, text }` (`text` = the chunk's words rejoined with single spaces, `endWordIndex` exclusive per the spec's `[(N-1)*150, N*150)` convention).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/text/sectionize.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/text/sectionize.ts lib/text/sectionize.test.ts
git commit -m "feat: split book text into fixed 150-word sections"
```

---

### Task 4: Vocabulary extraction

**Files:**
- Create: `lib/text/commonWords.json` (top 1000 common English words, one lowercase string per array entry, sourced per Ruling 6)
- Create: `lib/text/extractVocabulary.ts`
- Test: `lib/text/extractVocabulary.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `extractVocabulary(sectionText: string): string[]` (deduped, lowercase, punctuation-stripped candidate words, common words removed) — used by Task 7's `bookService.addBook`.

- [ ] **Step 1: Write failing tests**

```ts
test('lowercases, strips punctuation, dedupes, and drops common words', () => {
  const result = extractVocabulary('The Ephemeral, the EPHEMERAL moonlit grove. The grove!');
  expect(result).toEqual(['ephemeral', 'moonlit', 'grove']);
});

test('a section with only common words yields an empty list', () => {
  expect(extractVocabulary('the a is and or')).toEqual([]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/text/extractVocabulary.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `extractVocabulary(sectionText: string): string[]`**

Tokenize on `/[a-zA-Z']+/g`, `.toLowerCase()`, dedupe via `Set` (preserving first-seen order), filter out any token present in the imported `commonWords.json` list (load once at module scope, build a `Set<string>` for O(1) lookups).

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/text/extractVocabulary.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/text/extractVocabulary.ts lib/text/extractVocabulary.test.ts lib/text/commonWords.json
git commit -m "feat: extract per-section vocabulary candidates against a 1000-word common list"
```

---

### Task 5: Dictionary API client

**Files:**
- Create: `lib/dictionary/dictionaryApi.ts`
- Test: `lib/dictionary/dictionaryApi.test.ts`

**Interfaces:**
- Produces: `fetchDefinition(word: string): Promise<string | null>` — used by Task 7's `bookService.addBook` and Task 13's word-lookup route. Never throws.

- [ ] **Step 1: Write failing tests**

```ts
afterEach(() => vi.restoreAllMocks());

test('returns the first definition on a successful lookup', async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => [{ meanings: [{ definitions: [{ definition: 'a fleeting thing' }] }] }],
  });
  await expect(fetchDefinition('ephemeral')).resolves.toBe('a fleeting thing');
  expect(fetch).toHaveBeenCalledWith('https://api.dictionaryapi.dev/api/v2/entries/en/ephemeral');
});

test('returns null on a 404 (word not found)', async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
  await expect(fetchDefinition('zzznotaword')).resolves.toBeNull();
});

test('returns null on a network error rather than throwing', async () => {
  global.fetch = vi.fn().mockRejectedValue(new Error('network down'));
  await expect(fetchDefinition('ephemeral')).resolves.toBeNull();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/dictionary/dictionaryApi.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `fetchDefinition(word: string): Promise<string | null>`**

Wrap the `fetch` + response parsing in `try/catch`; return `null` on any thrown error, a non-ok response, or a response whose shape doesn't contain `data[0].meanings[0].definitions[0].definition`. On success, return that string.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/dictionary/dictionaryApi.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/dictionary
git commit -m "feat: dictionary API client with null-on-failure fallback"
```

---

### Task 6: EPUB parsing

**Files:**
- Create: `lib/epub/parseEpub.ts`
- Test: `lib/epub/parseEpub.test.ts`
- Test fixture: `lib/epub/fixtures/sample.epub` (a small valid EPUB checked in for the success-path test — build one with 2-3 short chapters of placeholder public-domain-style text; `epub2`'s own test fixtures, if license-compatible, or a minimal hand-built EPUB are both acceptable)

**Interfaces:**
- Produces: `parseEpub(buffer: Buffer): Promise<{ title: string; author: string | null; text: string }>` — used by Task 7's `bookService.addBook`. Rejects with a plain `Error` (caught by Task 7's route) on invalid input.

- [ ] **Step 1: Write failing tests**

```ts
test('parses a valid EPUB into title, author, and flattened chapter text', async () => {
  const buffer = readFileSync(join(__dirname, 'fixtures/sample.epub'));
  const result = await parseEpub(buffer);
  expect(result.title).toBeTruthy();
  expect(result.text.length).toBeGreaterThan(0);
});

test('rejects on a non-EPUB buffer instead of hanging or crashing the process', async () => {
  await expect(parseEpub(Buffer.from('not an epub'))).rejects.toThrow();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/epub/parseEpub.test.ts`
Expected: FAIL — module/fixture not found.

- [ ] **Step 3: Implement `parseEpub(buffer: Buffer)`**

Use `epub2`'s parser against a temp file (write `buffer` to a file under `os.tmpdir()`, since `epub2` reads by path; clean up the temp file in a `finally`), read `title`/`author` from its metadata and concatenate all chapter HTML bodies stripped of tags (a simple `.replace(/<[^>]+>/g, ' ')` is sufficient — no rich formatting is needed downstream) into `text`. Wrap the whole operation so any `epub2` parse failure becomes a rejected promise with a clear message (e.g. `"Could not parse EPUB file"`), satisfying Review Focus #4.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/epub/parseEpub.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/epub
git commit -m "feat: parse EPUB uploads into title/author/flattened text"
```

---

### Task 7: Book ingestion service + API route

**Files:**
- Create: `lib/books/bookService.ts`
- Create: `app/api/books/route.ts`
- Test: `lib/books/bookService.test.ts`, `app/api/books/route.test.ts`

**Interfaces:**
- Consumes: `splitIntoSections` (Task 3), `extractVocabulary` (Task 4), `fetchDefinition` (Task 5), `parseEpub` (Task 6), `lib/supabase/server.ts` (Task 2).
- Produces: `addBook(supabase: SupabaseClient, input: { title: string; author?: string; format: 'text' | 'epub'; rawText: string; userId: string }): Promise<{ bookId: string }>` — inserts the book, its sections, every section's extracted words (deduped against existing `words` rows for that user per the spec's `unique(user_id, word)` constraint — upsert, don't fail on conflict), and the `section_words` links; section 1's status is set to `ready_to_practice`, all others `locked`. Used by the route handler and by Task 11's book-detail page (read-only use).

- [ ] **Step 1: Write failing tests for `addBook`** (mock the Supabase client's `.from(...).insert(...)`/`.upsert(...)` chain; mock `fetchDefinition` to resolve immediately)

```ts
test('creates one section per 150 words and marks only section 1 ready_to_practice', async () => { /* assert insert payloads */ });
test('extracted words are upserted against the existing (user_id, word) row, not duplicated', async () => { /* assert upsert with onConflict: 'user_id,word' */ });
test('a dictionary lookup failure for one word does not abort the rest of the book add', async () => { /* fetchDefinition mock: one call rejects/returns null, assert addBook still resolves and still inserts the other words */ });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/books/bookService.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `addBook`**

Steps inside the function: insert the `books` row; call `splitIntoSections(rawText)` and insert one `sections` row per entry (`status: index === 0 ? 'ready_to_practice' : 'locked'`); for each section, call `extractVocabulary(section.text)`, then for each candidate word call `fetchDefinition` (via `Promise.all`, each wrapped so one rejection doesn't reject the whole batch — reuse the pattern that `fetchDefinition` itself never throws), `upsert` each into `words` with `onConflict: 'user_id,word'` (only setting `definition` if the row is new — an existing row's SM-2 state must not be reset by re-extraction), then insert the resulting `(section_id, word_id)` pairs into `section_words`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/books/bookService.test.ts`
Expected: PASS.

- [ ] **Step 5: Write failing tests for the route**

```ts
test('POST with { title, format: "text", rawText } calls addBook and returns 201 with the new bookId', async () => { /* mock bookService.addBook */ });
test('POST with format: "epub" parses the uploaded file via parseEpub before calling addBook', async () => { /* mock parseEpub */ });
test('an unparseable EPUB upload returns 400, not 500', async () => { /* mock parseEpub rejecting */ });
```

- [ ] **Step 6: Run tests to verify they fail, then implement `app/api/books/route.ts`**

`POST` handler: get the authed user via `lib/supabase/server.ts` (401 if none); read `multipart/form-data` (`request.formData()`); if a `file` field is present and its name ends in `.epub`, read it into a `Buffer`, upload it to the `epubs` Storage bucket under `${userId}/${crypto.randomUUID()}.epub` (Ruling 5), call `parseEpub` (catch its rejection → `NextResponse.json({ error: ... }, { status: 400 })`), and use its `text`/`title`/`author`; otherwise read the `title`/`rawText` text fields directly. Call `addBook(...)`. Return `NextResponse.json({ bookId }, { status: 201 })`.

- [ ] **Step 7: Run both test files, typecheck**

Run: `npx vitest run lib/books app/api/books && npm run typecheck`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add lib/books app/api/books
git commit -m "feat: book ingestion service and add-book API route"
```

---

### Task 8: SM-2 rating engine

**Files:**
- Create: `lib/srs/sm2.ts`
- Test: `lib/srs/sm2.test.ts`

**Interfaces:**
- Produces: `type Rating = 'again' | 'hard' | 'good' | 'easy'`; `applyRating(state: { repetitions: number; easeFactor: number; intervalDays: number }, rating: Rating, today: Date): { repetitions: number; easeFactor: number; intervalDays: number; nextReviewDate: Date; lastRating: Rating }` — used by Task 12's rate-word API route.

- [ ] **Step 1: Write failing tests (exact values from the Global Constraints formulas)**

```ts
const base = { repetitions: 2, easeFactor: 2.0, intervalDays: 10 };
const today = new Date('2026-11-13');

test('again resets repetitions/interval and lowers ease, floored at 1.3', () => {
  expect(applyRating(base, 'again', today)).toMatchObject({ repetitions: 0, intervalDays: 1, easeFactor: 1.8 });
  expect(applyRating({ ...base, easeFactor: 1.35 }, 'again', today).easeFactor).toBe(1.3);
});

test('hard grows interval by 1.2x and lowers ease by 0.15, floored at 1.3', () => {
  expect(applyRating(base, 'hard', today)).toMatchObject({ repetitions: 3, intervalDays: 12, easeFactor: 1.85 });
});

test('good grows interval by the ease factor, ease unchanged', () => {
  expect(applyRating(base, 'good', today)).toMatchObject({ repetitions: 3, intervalDays: 20, easeFactor: 2.0 });
});

test('easy grows interval by ease*1.3 and raises ease by 0.15', () => {
  expect(applyRating(base, 'easy', today)).toMatchObject({ repetitions: 3, intervalDays: 26, easeFactor: 2.15 });
});

test('nextReviewDate is today plus the new interval in days', () => {
  expect(applyRating(base, 'good', today).nextReviewDate).toEqual(new Date('2026-12-03'));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/srs/sm2.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `applyRating`**

Switch on `rating`, apply exactly the five formulas from Global Constraints (`Math.round` for interval growth, `Math.max(1.3, ...)` for the ease floor), then compute `nextReviewDate` by adding `intervalDays` days to `today`, and return `lastRating: rating` alongside the new state.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/srs/sm2.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/srs
git commit -m "feat: SM-2 rating engine per the four-button again/hard/good/easy spec"
```

---

### Task 9: Section recognition rate + unlock logic

**Files:**
- Create: `lib/sections/sectionService.ts`
- Test: `lib/sections/sectionService.test.ts`

**Interfaces:**
- Consumes: nothing beyond raw Supabase query results (mocked in tests).
- Produces: `computeRecognitionRate(words: { lastRating: string | null }[]): number` (pure, 1.0 for an empty array — Review Focus #5) and `maybeUnlockNextSection(supabase: SupabaseClient, sectionId: string): Promise<void>` (reads the section's words via `section_words`, computes the rate, and if `>= 0.8` sets that section's status to `ready_to_read` and the next section_number's status to `ready_to_practice` if it's currently `locked`) — used by Task 12's rate-word route after every rating.

- [ ] **Step 1: Write failing tests for `computeRecognitionRate`**

```ts
test('rate is the fraction of words last rated good or easy', () => {
  const words = [{ lastRating: 'good' }, { lastRating: 'easy' }, { lastRating: 'again' }, { lastRating: null }];
  expect(computeRecognitionRate(words)).toBe(0.5);
});

test('a section with zero words auto-passes at 1.0', () => {
  expect(computeRecognitionRate([])).toBe(1);
});

test('79% does not meet the 80% threshold, 80% exactly does', () => {
  const near = Array.from({ length: 100 }, (_, i) => ({ lastRating: i < 79 ? 'good' : 'again' }));
  expect(computeRecognitionRate(near) >= 0.8).toBe(false);
  const exact = Array.from({ length: 100 }, (_, i) => ({ lastRating: i < 80 ? 'good' : 'again' }));
  expect(computeRecognitionRate(exact) >= 0.8).toBe(true);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/sections/sectionService.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `computeRecognitionRate`**

`words.length === 0 ? 1 : words.filter(w => w.lastRating === 'good' || w.lastRating === 'easy').length / words.length`.

- [ ] **Step 4: Write failing tests for `maybeUnlockNextSection`** (mock the Supabase client's query chain to return a fixed set of section words and a next-section row)

```ts
test('unlocks reading for this section and practice for the next when the rate crosses 80%', async () => { /* assert two update() calls with the right ids/statuses */ });
test('does nothing when the rate is below 80%', async () => { /* assert no update() calls */ });
test('does not relock or re-unlock a section that is already ready_to_read/completed', async () => { /* idempotency */ });
```

- [ ] **Step 5: Run tests to verify they fail, then implement `maybeUnlockNextSection`**

Query this section's words (join through `section_words`) and their `last_rating`, mapping each row to `{ lastRating: row.last_rating }` before passing the array to `computeRecognitionRate`; compute the rate; if `< 0.8`, return. If `>= 0.8`: update this section to `ready_to_read` (only if not already past that state); fetch the next `section_number` for the same `book_id`; if it exists and its status is `locked`, update it to `ready_to_practice`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run lib/sections/sectionService.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/sections
git commit -m "feat: per-section recognition rate and next-section unlock logic"
```

---

### Task 10: Library page + add-book UI

**Files:**
- Create: `app/library/page.tsx`
- Create: `components/AddBookForm.tsx`
- Test: `components/AddBookForm.test.tsx`

**Interfaces:**
- Consumes: `app/api/books/route.ts` (Task 7, via `fetch('/api/books', { method: 'POST', body: formData })`), `lib/supabase/server.ts` (Task 2, for listing the user's books).

- [ ] **Step 1: Write failing tests for `AddBookForm`**

```ts
test('submitting pasted text posts a multipart form with title, format=text, rawText', async () => { /* mock fetch, fill title + textarea, click submit, assert fetch body */ });
test('choosing a file switches the form to upload mode and posts format based on file extension', async () => { /* .epub vs .txt */ });
test('shows the API error message when the POST fails', async () => { /* mock fetch resolving { ok: false }, assert error text rendered */ });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/AddBookForm.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `components/AddBookForm.tsx`**

Client component: a title input, a toggle between "paste text" (textarea) and "upload file" (file input accepting `.txt,.epub`), and a submit handler that builds a `FormData` (`title`, `format`, plus either `rawText` or `file`) and POSTs it to `/api/books`; on success, call `router.refresh()` (library page re-fetches); on failure, render the server's `error` message.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/AddBookForm.test.tsx`
Expected: PASS.

- [ ] **Step 5: Implement `app/library/page.tsx`** (no test — server component, thin query + list)

Server component: fetch the current user's `books` via `lib/supabase/server.ts`, render each as a link to `/book/[id]`, and render `<AddBookForm />` above the list. Redirect to `/login` if there's no session.

- [ ] **Step 6: Run full suite and typecheck**

Run: `npm test && npm run typecheck`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add app/library components/AddBookForm.tsx components/AddBookForm.test.tsx
git commit -m "feat: library page with paste-text/upload-file add-book form"
```

---

### Task 11: Book detail page

**Files:**
- Create: `app/book/[id]/page.tsx`
- Create: `components/SectionStatusBadge.tsx`
- Test: `components/SectionStatusBadge.test.tsx`

**Interfaces:**
- Consumes: `lib/supabase/server.ts` (Task 2).

- [ ] **Step 1: Write failing tests for `SectionStatusBadge`**

```ts
test.each([
  ['locked', 'Locked'],
  ['ready_to_practice', 'Practice to unlock'],
  ['ready_to_read', 'Ready to read'],
  ['completed', 'Completed'],
])('renders the right label for status %s', (status, label) => {
  render(<SectionStatusBadge status={status} />);
  expect(screen.getByText(label)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run components/SectionStatusBadge.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `SectionStatusBadge({ status }: { status: string })`**

A small `<span>` mapping each of the four status strings to its label and a Tailwind background color class.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run components/SectionStatusBadge.test.tsx`
Expected: PASS.

- [ ] **Step 5: Implement `app/book/[id]/page.tsx`** (no test — server component)

`{ params: Promise<{ id: string }> }` (await params per Next 15). Fetch the book and its `sections` ordered by `section_number`; render the title/author and a list of sections, each showing `SectionStatusBadge` and a link to `/book/[id]/practice/[sectionNumber]` if `ready_to_practice`, or `/book/[id]/read/[sectionNumber]` if `ready_to_read`/`completed`, or plain text (no link) if `locked`.

- [ ] **Step 6: Run full suite, typecheck**

Run: `npm test && npm run typecheck`

- [ ] **Step 7: Commit**

```bash
git add app/book components/SectionStatusBadge.tsx components/SectionStatusBadge.test.tsx
git commit -m "feat: book detail page listing sections with unlock status"
```

---

### Task 12: Practice flow (flashcards + rating)

**Files:**
- Create: `app/book/[id]/practice/[sectionNumber]/page.tsx`
- Create: `components/Flashcard.tsx`, `components/RatingButtons.tsx`, `components/SpeakButton.tsx`
- Create: `app/api/words/[wordId]/rate/route.ts`
- Test: `components/Flashcard.test.tsx`, `components/RatingButtons.test.tsx`, `components/SpeakButton.test.tsx`, `app/api/words/[wordId]/rate/route.test.ts`

**Interfaces:**
- Consumes: `applyRating` (Task 8), `maybeUnlockNextSection` (Task 9).
- Produces: `POST /api/words/[wordId]/rate` with body `{ rating: Rating }` → applies Task 8's formula to that word's current state, persists it, calls `maybeUnlockNextSection` for every section containing that word, returns the updated word.

- [ ] **Step 1: Write failing tests for `SpeakButton`**

```ts
test('clicking the speak button calls window.speechSynthesis.speak with an utterance for the word', () => {
  const speak = vi.fn();
  vi.stubGlobal('speechSynthesis', { speak });
  render(<SpeakButton word="ephemeral" />);
  fireEvent.click(screen.getByRole('button'));
  expect(speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'ephemeral' }));
});
```

- [ ] **Step 2: Run test to verify it fails, then implement `SpeakButton({ word }: { word: string })`**

A button whose `onClick` calls `window.speechSynthesis.speak(new SpeechSynthesisUtterance(word))`.

- [ ] **Step 3: Run test to verify it passes**

Run: `npx vitest run components/SpeakButton.test.tsx`

- [ ] **Step 4: Write failing tests for `RatingButtons`, then implement**

Test: renders four buttons labeled Again/Hard/Good/Easy; clicking one calls `onRate('again' | 'hard' | 'good' | 'easy')`. Implementation: four buttons, `onClick={() => onRate(value)}`.

- [ ] **Step 5: Write failing tests for `Flashcard`, then implement**

Tests: shows the word and a "Show definition" button initially hiding the definition; clicking it reveals the definition text and the `RatingButtons`; clicking a rating button calls the `onRate` prop with that rating. Implementation: composes `SpeakButton` + a reveal toggle + `RatingButtons`, matching the existing project's reveal/remount lesson — **pass `key={word.id}` where this component is rendered in a list** (the practice page, Step 8) so revealed state doesn't leak between cards, per the known bug class from the prior prototype.

- [ ] **Step 6: Write failing tests for the rate API route**

```ts
test('POST applies the rating via applyRating, persists the new state, and triggers unlock checks', async () => { /* mock supabase + applyRating + maybeUnlockNextSection, assert update() payload and that maybeUnlockNextSection was called for each section_words row */ });
test('rating an unknown wordId returns 404', async () => { /* mock select() resolving no rows */ });
```

- [ ] **Step 7: Run tests to verify they fail, then implement `app/api/words/[wordId]/rate/route.ts`**

`POST`: auth check (401 if none); fetch the word row (404 if missing or not owned — RLS already prevents cross-user reads, so "missing" covers both); map its snake_case DB columns to `applyRating`'s camelCase state shape (`{ repetitions, easeFactor: ease_factor, intervalDays: interval_days }`) and call `applyRating(state, body.rating, new Date())`; map the camelCase result back to snake_case (`ease_factor`, `interval_days`, `next_review_date`, `last_rating`) for the `update` call; query `section_words` for this `word_id` to find every section it belongs to, and call `maybeUnlockNextSection` for each; return the updated word as JSON.

- [ ] **Step 8: Implement `app/book/[id]/practice/[sectionNumber]/page.tsx`**

Server component fetches the section's due/new words (via `section_words` joined to `words`, filtered to this user); passes them to a small client sub-component that steps through one `Flashcard` at a time (`key={word.id}` per Step 5), POSTing to the rate route on each rating and advancing to the next word; after the last word, show a "Done — check back on the book page" message with a link to `/book/[id]`.

- [ ] **Step 9: Run full suite, typecheck**

Run: `npm test && npm run typecheck`

- [ ] **Step 10: Commit**

```bash
git add app/book components/Flashcard.tsx components/RatingButtons.tsx components/SpeakButton.tsx app/api/words
git commit -m "feat: practice flow with SM-2 rating, pronunciation, and unlock triggers"
```

---

### Task 13: Reader + tap-to-define

**Files:**
- Create: `app/book/[id]/read/[sectionNumber]/page.tsx`
- Create: `components/WordPopup.tsx`
- Create: `app/api/words/lookup/route.ts`
- Test: `components/WordPopup.test.tsx`, `app/api/words/lookup/route.test.ts`

**Interfaces:**
- Consumes: `fetchDefinition` (Task 5), `applyRating`'s new-word defaults (Task 8 — `repetitions: 0, intervalDays: 1, easeFactor: 2.5`).
- Produces: `POST /api/words/lookup` with body `{ word: string }` → looks up (or reuses an existing) word row for this user, defaulting its SM-2 state, and returns `{ word, definition }`.

- [ ] **Step 1: Write failing tests for `WordPopup`**

```ts
test('clicking a word shows its definition once the lookup resolves, and an add-to-vocabulary confirmation after posting', async () => { /* mock fetch, click word span, assert definition renders, click "Add to my vocabulary", assert confirmation text */ });
```

- [ ] **Step 2: Run test to verify it fails, then implement `WordPopup`**

A clickable `<span>` per word; on click, `fetch('/api/words/lookup', { method: 'POST', body: JSON.stringify({ word }) })`, show a small popover with the returned definition, a `SpeakButton`, and an "Add to my vocabulary" button that's already implicitly satisfied (the lookup route itself upserts the word) — show "Added ✓" once the lookup response resolves.

- [ ] **Step 3: Run test to verify it passes**

Run: `npx vitest run components/WordPopup.test.tsx`

- [ ] **Step 4: Write failing tests for the lookup route, then implement**

Tests: POST with a new word creates a `words` row with the SM-2 defaults and returns its definition; POST with a word the user already has returns the existing definition without resetting `repetitions`/`ease_factor` (mirrors Task 7's upsert rule). Implementation: auth check; `fetchDefinition(word)`; `upsert` into `words` with `onConflict: 'user_id,word'`, only setting the SM-2 default columns `ignoreDuplicates`-style (don't overwrite an existing row's SRS state — same approach as Task 7); return `{ word, definition }`.

- [ ] **Step 5: Implement `app/book/[id]/read/[sectionNumber]/page.tsx`**

Server component: verify the section's status is `ready_to_read` or `completed` (redirect to `/book/[id]` otherwise — enforces the spec's "only reachable once unlocked" rule); render the section's `text` split into words, each wrapped in a `WordPopup`; a "Mark section complete" button that updates this section's status to `completed`.

- [ ] **Step 6: Run full suite, typecheck**

Run: `npm test && npm run typecheck`

- [ ] **Step 7: Commit**

```bash
git add app/book/[id]/read components/WordPopup.tsx app/api/words/lookup
git commit -m "feat: reader with tap-to-define and add-to-vocabulary lookups"
```

---

### Task 14: Global review page

**Files:**
- Create: `app/review/page.tsx`
- Test: none required (server component composing already-tested `Flashcard`/`RatingButtons`; covered by Task 12's component tests plus a manual smoke check in Task 15)

**Interfaces:**
- Consumes: `Flashcard`, `RatingButtons` (Task 12), the rate API route (Task 12).

- [ ] **Step 1: Implement `app/review/page.tsx`**

Server component: query this user's `words` where `next_review_date <= current_date`, ordered by `next_review_date`; render the same practice-flow client sub-component introduced in Task 12 (extract it to `components/PracticeSession.tsx` if Task 12 left it inline in the page file, so both pages share one implementation) over this due-word list instead of a section's words.

- [ ] **Step 2: Run full suite, typecheck**

Run: `npm test && npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add app/review components/PracticeSession.tsx
git commit -m "feat: global due-word review page across all books"
```

---

### Task 15: README + end-to-end smoke test

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: nothing new.

- [ ] **Step 1: Rewrite `README.md`**

Document: what this app does (one paragraph), the stack, how to run it locally (`npm install`, Supabase project setup — run `supabase/migrations/0001_init.sql` against a new Supabase project, fill `.env.local` from `.env.local.example`, `npm run dev`), and a "v2 extension points" section listing exactly the spec's out-of-scope list (PDF, non-English content, translation, payments, social login, offline/mobile, configurable section size/threshold, admin/analytics dashboards, cloud TTS) plus the eight Rulings from this plan's header, so a future reader knows which gaps are deliberate.

- [ ] **Step 2: Manual end-to-end smoke test** (requires a real Supabase project — see the plan's final-review note if one isn't available yet)

Run `npm run dev`; sign up; paste in a short multi-section plain-text passage (≥ 160 words, so there are 2 sections); confirm section 1 is practiceable, section 2 is locked; rate every word Good/Easy in section 1; confirm section 2 becomes practiceable and section 1 becomes readable; open the reader, tap a word, confirm its definition appears and it shows up on `/review`.

- [ ] **Step 3: Run full suite and typecheck one final time**

Run: `npm test && npm run typecheck`
Expected: all pass, zero type errors.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README for the Supabase-backed rebuild"
```
