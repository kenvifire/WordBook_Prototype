# WordBook

WordBook is an account-based web app for learning vocabulary from the books you're actually reading. Add a book (paste text, upload a `.txt`, or upload an `.epub`), and WordBook splits it into fixed 150-word sections and pulls out the non-common words in each one. Before you can read a section you have to practice its vocabulary as SM-2 flashcards (with free dictionary definitions and browser text-to-speech pronunciation); once you recognize at least 80% of a section's words, it unlocks for reading, and tapping any word while reading shows its definition and adds it to your review queue. A global `/review` page surfaces every word across every book that's due for spaced-repetition review today.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript 5**
- **Supabase** — Postgres (data), Auth (email/password), Storage (uploaded EPUB files)
- **Tailwind CSS 3** for styling
- `epub2` for server-side EPUB parsing
- Free dictionary lookups via `api.dictionaryapi.dev` (no API key) and the browser's native `speechSynthesis` for pronunciation (no cloud TTS)
- **Vitest 2** + Testing Library for tests

No paid or keyed third-party APIs are required to run this app.

## Running locally

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project**

   Create a new project at [supabase.com](https://supabase.com) (the free tier is enough).

3. **Apply the database schema**

   Run `supabase/migrations/0001_init.sql` against your new project — either paste its contents into the Supabase dashboard's SQL Editor and run it, or, with the [Supabase CLI](https://supabase.com/docs/guides/cli) linked to your project, run:

   ```bash
   supabase db push
   ```

   This creates the `books`, `sections`, `words`, and `section_words` tables along with their Row Level Security policies, and also expects an `epubs` Storage bucket to exist for uploaded EPUB files — create it from the Supabase dashboard's Storage section if the migration doesn't provision it for you.

4. **Configure environment variables**

   ```bash
   cp .env.local.example .env.local
   ```

   Fill in the three values from your Supabase project's API settings:

   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```

5. **Run the app**

   ```bash
   npm run dev
   ```

   Then visit `http://localhost:3000`, sign up for an account, and add a book from `/library`.

### Other scripts

```bash
npm test        # run the Vitest suite (mocks Supabase and fetch — no live project needed)
npm run typecheck
npm run build
```

> **Note on this build:** the full manual end-to-end flow (sign up, add a multi-section book, practice a section to 80%, confirm it unlocks, read and tap-to-define, see the word on `/review`) has **not** been exercised against a real Supabase project as of this writing — no project credentials were available during implementation. Everything above is implemented and covered by the unit/integration test suite with mocked Supabase/fetch clients, but a first real run against a live project is still pending.

## Known decisions / v2 extension points

### Explicitly out of scope for v1 (per spec)

The product spec deliberately excludes the following from this build; a future version could add any of them:

- PDF book uploads
- Non-English book content
- Translation features
- Payments / monetization
- Social login (email + password only)
- Offline or native mobile apps
- Configurable section size or unlock threshold (fixed at 150 words / 80%)
- Admin or analytics dashboards
- Cloud text-to-speech (browser `speechSynthesis` only)

### Implementation-level rulings made during this build

The spec left some implementation details open; these decisions were made while building and are documented in full in `docs/superpowers/plans/2026-11-13-wordbook-webapp-v2.md`:

1. **`section_words` join table.** Added (additively) to link sections to their member words many-to-many, since the spec's `words` table has no section reference but section unlock logic needs it.
2. **Row Level Security everywhere.** Every table has RLS policies scoped to `auth.uid()`, even though the spec only implies per-user ownership rather than stating RLS explicitly — treated as a correctness requirement for a multi-user app.
3. **`epub2` over `epubjs`** for EPUB parsing, since `epubjs` targets browser DOM/Blob APIs and parsing happens server-side in a Next.js API route.
4. **Tailwind CSS v3**, not v4, for tooling stability (the spec didn't pin a version).
5. **Supabase Storage holds raw uploaded `.epub` files** (in an `epubs` bucket) in addition to the flattened `raw_text` stored in Postgres; pasted or `.txt` text never touches Storage.
6. **The common-words list is the first 1000 entries of the MIT-licensed `first20hours/google-10000-english` frequency list**, bundled as `lib/text/commonWords.json`.
7. **Recognition rating is global per word, not per book/section.** A word's `last_rating` is shared across every book it appears in, so mastering it in one book counts immediately toward another book's section unlock — matching the spec's own one-row-per-`(user_id, word)` schema.
8. **The old local-JSON/OpenAI/MyMemory prototype was deleted outright** (`app/`, `components/`, `lib/`, `scripts/`, `data/` from the prior version) rather than migrated; `docs/business-tech-note.md` and `docs/runbook.md` are left untouched as historical record of that retired version.

### Known backlog / rough edges

Accumulated during implementation, not yet addressed:

- **No transaction/rollback across the multi-step book-add flow.** Adding a book inserts the book row, then its sections, words, and `section_words` rows in separate steps; a failure partway through can leave a partially-created book rather than rolling back atomically.
- **Dictionary lookups scale linearly with book length.** Each unique non-common word triggers its own lookup to `api.dictionaryapi.dev`; a very long book could be slow enough to risk a request timeout during the add-book flow.
- **No DB-level race guard on rapid double-taps of a brand-new word in the reader.** Tapping a word that doesn't yet have a `words` row twice in quick succession could race to insert it twice rather than being guarded by a unique constraint or upsert.
- **`commonWords.json` is an unfiltered word-frequency list.** It's sourced directly from a frequency list, not curated for a "common words" filter, so it contains a few words some would consider inappropriate to have in that context.
