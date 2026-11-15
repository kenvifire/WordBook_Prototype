# AGENTS.md

Coordination doc for AI agents (and humans) working in this repo. Read this before making changes.

> **A v3 redesign is being designed right now** — AI-generated story books, multi-language support, a Bookshelf/Practice/Statistics tab restructure, a user-configurable recognition threshold, a new Free-reading mode alongside today's practice-to-unlock flow, and user-configurable book sectioning (by page count or by chapter) for uploaded books. Full requirements and rulings: `docs/superpowers/specs/2026-11-15-wordbook-v3-design.md`. **This design has not yet been approved for implementation and no plan exists yet** — everything below still describes the live v1 app exactly as it runs today. Don't build against the v3 doc until a written plan exists (`docs/superpowers/plans/`); do read it before touching anything the "Out of scope for v1" section below calls out, since several of those exclusions are exactly what v3 is lifting.

## What this is

WordBook is an account-based web app for learning vocabulary from books you're reading. Add a book (paste text, `.txt`, or `.epub`), and it splits into fixed 150-word sections, extracting the non-common words in each one. Before you can read a section you practice its vocabulary as SM-2 spaced-repetition flashcards; once you recognize ≥80% of a section's words, it unlocks for reading. Tapping any word while reading shows its definition; an explicit "Add to my vocabulary" button adds it to your global review queue. A `/review` page surfaces every word across every book due for spaced-repetition review today.

This is a course prototype (demo/final-package deliverable), not a commercial product — keep that in mind when judging scope: v1 is intentionally narrow (see "Out of scope" below).

## Architecture

**Stack:** Next.js 15 (App Router) + TypeScript 5, Firebase (Firestore + Authentication + Storage) as the only backend, Tailwind CSS 3. No ORM, no separate server — Next.js API routes and Server Components talk to Firestore directly via the Admin SDK.

**Critical design rule — read this first:** the Firebase **Admin SDK** (server-side only, via `lib/firebase/admin.ts` / `lib/firebase/server.ts`) is the *only* thing that ever touches Firestore or Storage in this app. The Firebase **client SDK** is used in exactly one place — `components/GoogleSignInButton.tsx`, `app/login/page.tsx`, `app/signup/page.tsx` — purely to obtain an ID token, which is then exchanged for an httpOnly session cookie via `POST /api/auth/session`. Nothing in this app does a Firestore read/write directly from the browser. This means Firestore Security Rules (`firestore.rules`, `storage.rules`) are a defense-in-depth layer, not the primary enforcement — the primary enforcement is that every Admin SDK query/mutation in the code explicitly filters by the authenticated user's uid. **Any change that adds a new Firestore read/write must include that uid filter**, and if it's a `create`, must also match what `firestore.rules` expects (see the uid-prefixed document ID rule below) or the write will be rejected if a security-rules test or live project is involved — but more importantly, because a missing filter is a real cross-user data leak, not just a rules violation.

### Data model (Firestore)

- `books/{bookId}` — `userId`, `title`, `author`, `format` (`'text'|'epub'`), `createdAt` (server timestamp). **No `rawText` field** — the whole book's text is never stored in one place (Firestore has a 1 MiB per-document limit; a long novel would exceed it). Each section stores its own slice instead.
- `books/{bookId}/sections/{sectionId}` (subcollection) — `sectionNumber`, `startWordIndex`, `endWordIndex`, `status` (`'locked'|'ready_to_practice'|'ready_to_read'|'completed'`), `wordIds: string[]`, `text` (this section's own ~150-word slice).
- `words/{wordId}` (top-level collection) — **document ID is deterministic: `${userId}_${word}`**, not an auto-ID. This dedupes a word per user across every book and makes creation race-safe: use `.create()` (which atomically fails with gRPC code `6` if the doc already exists — see `lib/firebase/errors.ts`'s `isAlreadyExistsError`) instead of `.set()`/`upsert`. Fields: `userId`, `word`, `definition`, `repetitions`, `easeFactor`, `intervalDays`, `nextReviewDate`, `lastRating`, `sectionRefs: {bookId, sectionId}[]`, `addedFromReader` (boolean, **immutable, set once at creation, never written again** — `true` only when created via the reader's "Add to my vocabulary" button, `false` only when created via book-extraction; this is how `/review` knows to show a never-rated reader-added word even though it has no section).

**Rule everyone must follow:** never overwrite an existing word's `definition`, `sectionRefs`, or SM-2 state on re-extraction or re-lookup. Both writers (`lib/books/bookService.ts`, `app/api/words/lookup/route.ts`) select-first and only touch fields that are safe to touch (e.g. `arrayUnion` on `sectionRefs`, a null-guarded `definition` backfill). A previous version of this app had a real data-loss bug here (an upsert that clobbered good data) — don't reintroduce the pattern.

### Known sharp edges (each was a real bug caught in review — don't reintroduce)

1. **The per-section practice page (`app/book/[id]/practice/[sectionNumber]/page.tsx`) must NEVER filter words by due-date.** Its job is "show every word in this section until it unlocks," not spaced-repetition scheduling. A due-date filter here once made it impossible to retry a failed word same-day (SM-2 pushes `nextReviewDate` to tomorrow on *every* rating, including "again"). Due-date filtering belongs only on `/review`.
2. **A section with zero vocabulary words must still be able to unlock.** `maybeUnlockNextSection` is only ever invoked from the rate route — a zero-word section has nothing to rate. The practice page explicitly calls it itself for this case (see the C1 handling at the top of that page).
3. **`maybeUnlockNextSection` must only advance a section whose status is exactly `ready_to_practice`.** A `locked` section must never jump straight to `ready_to_read` just because the global recognition rate for its words happens to already be ≥80% (e.g. a word already mastered via another book).
4. **Tapping a word in the reader must never silently insert it into the SRS queue.** Only the explicit "Add to my vocabulary" action does. `app/api/words/lookup/route.ts` distinguishes these via a `add: true` flag in the request body.
5. **The Firestore `create` rule for `words` binds the document ID to the authenticated uid** (`wordId == request.auth.uid + '_' + request.resource.data.word`) specifically to prevent an attacker from squatting on another user's deterministic word-doc ID. If you ever change the word ID scheme, update `firestore.rules` in lockstep.

### Out of scope for v1 (don't build unless asked)

PDF support, non-English content, translation, payments, social login beyond Google, offline/mobile app, configurable section size/threshold, admin/analytics dashboards, cloud TTS (pronunciation uses the browser's built-in `window.speechSynthesis`, nothing server-side).

**Note:** PDF support, non-English content, translation, and configurable section size/threshold are exactly what the in-progress v3 design (see the callout at the top of this file) lifts — they stay out of scope for v1 work, but don't treat them as permanently excluded from this app. (PDF support in v3 is scoped to text-layer PDFs only — no OCR for scanned/image-only PDFs.)

## Directory map

```
app/
  login/, signup/            Firebase Auth (email/password + Google), client components
  settings/                  account info + sign-out
  library/                   list books, add-book form
  book/[id]/                 book detail (section list)
  book/[id]/practice/[n]/    flashcard practice for one section
  book/[id]/read/[n]/        reader with tap-to-define
  review/                    global due-word review across all books
  api/auth/session/          POST exchanges a Firebase idToken for a session cookie; DELETE revokes it
  api/books/                 POST ingests a new book (text or .epub)
  api/words/lookup/          POST looks up (and optionally adds) a word
  api/words/[wordId]/rate/   POST applies an SM-2 rating
components/                  presentational + client components (Flashcard, WordPopup, PracticeSession, forms, nav)
lib/
  firebase/                  admin.ts (Admin SDK init), client.ts (client SDK init, auth-only),
                              server.ts (getAuthedUser()), errors.ts (Firestore error helpers)
  books/bookService.ts       book ingestion: sectionize → extract vocab → fetch definitions → write Firestore
  sections/sectionService.ts recognition-rate calc + unlock logic
  srs/sm2.ts                 the exact SM-2 variant this app uses (see Global rules below)
  text/                      sectionize, extractVocabulary, commonWords.json, normalizeWord — all pure, no Firebase dep
  dictionary/dictionaryApi.ts  free dictionaryapi.dev client, never throws
  epub/parseEpub.ts          EPUB → {title, author, text}, never throws
middleware.ts                 cheap cookie-presence redirect for protected routes (NOT full session verification — see below)
firestore.rules / storage.rules / firestore.indexes.json   deploy via Firebase CLI, see docs/runbook.md
.github/workflows/deploy.yml  CI: test, then auto-deploy to production on every push to main
```

## Auth model specifics

- Session is an httpOnly cookie set by `POST /api/auth/session`, verified server-side by `getAuthedUser()` (`lib/firebase/server.ts`) via `verifySessionCookie(cookie, true)` — every protected page/route calls this itself.
- `middleware.ts` does **only** a cheap cookie-presence check (redirect to `/login` if absent) for `/library`, `/book`, `/review`, `/settings` — it does **not** verify the cookie, because `verifySessionCookie` needs Node APIs that aren't reliably available in Next.js Edge middleware. Don't "fix" this by adding real verification to middleware; the per-page `getAuthedUser()` call is the actual gate.
- Sign-out (`DELETE /api/auth/session`) calls `revokeRefreshTokens` server-side, not just clearing the cookie — otherwise a copied cookie would keep working until its 14-day expiry.

## The SM-2 variant (exact, don't "correct" it to textbook SM-2)

New word: `repetitions=0, interval=1, easeFactor=2.5`. Then, per rating:
- **again**: `repetitions=0, interval=1, easeFactor=max(1.3, easeFactor-0.2)`
- **hard**: `repetitions+=1, interval=round(interval*1.2), easeFactor=max(1.3, easeFactor-0.15)`
- **good**: `repetitions+=1, interval=round(interval*easeFactor)`, easeFactor unchanged
- **easy**: `repetitions+=1, interval=round(interval*easeFactor*1.3), easeFactor+=0.15`
- Always: `nextReviewDate = today + interval days` (UTC).

## How to run it

```bash
npm install
cp .env.local.example .env.local   # fill in from your Firebase project (see docs/runbook.md)
npm run dev                        # http://localhost:3000
```

```bash
npm test          # vitest, 138+ tests, mocks firebase-admin — no live project needed
npm run typecheck # tsc --noEmit
npm run build     # next build — catches things tsc/vitest don't (see note below)
```

**`npm run build` is not optional before calling something done.** Two real production-only failures have happened in this repo that `tsc --noEmit` and the test suite both missed:
- A named export from `app/layout.tsx` that Next's App Router build-time file-convention check rejects (plain `tsc` doesn't know this rule). Layout files may only export `default`, `metadata`, `generateMetadata`, `viewport`, `generateViewport`. Anything else — a shared component, a helper — belongs in `components/`, imported and rendered, not exported from the layout.
- A missing transitive dependency (`@opentelemetry/api`, needed by `@google-cloud/firestore`) that broke both `npm ci` and `next build`'s page-data collection despite `npm install` and `tsc` being clean.

Always run `npm run build` locally before pushing something you believe is deploy-ready.

## Deployment

Auto-deploys on every push to `main` via `.github/workflows/deploy.yml`: runs `typecheck` + `test`, and only on success SSHes into the production server with a dedicated, command-restricted key to `git fetch && git reset --hard origin/main && npm install && npm run build && systemctl restart wordbook`. If the build fails, the restart never happens, so the live site keeps serving the last good build. Live at `wordbook.itluobo.com`. See `docs/runbook.md` for the full operational rundown (known risks, fallback plan, costs) and `docs/business-tech-note.md` for the product/business case this was built for.

The deploy key is scoped server-side (via `authorized_keys` `command=`) to only ever run that fixed deploy command — it cannot open an interactive shell, even if it leaked.

## How to contribute

1. **Test-first.** This repo is TDD throughout — every `lib/` and most `app/`/`components/` files have a co-located `*.test.ts(x)`. Write the failing test, confirm it fails, implement, confirm it passes. Mock `firebase-admin`/`firebase-admin/firestore`/`firebase-admin/auth` and `firebase/auth` at the module level (see any existing test for the established mocking shape — there's a consistent in-memory-fake-Firestore style used throughout `lib/books/bookService.test.ts`, `lib/sections/sectionService.test.ts`, etc.; match it rather than inventing a new one).
2. **No new abstractions for one caller.** Don't add a generic "repository layer" or similar; this codebase deliberately keeps one small service file per concern (`bookService.ts`, `sectionService.ts`) with plain Admin SDK calls inline.
3. **Keep the Admin-SDK-only rule.** Never add a Firestore/Storage call from a client component. If a page needs data, it's a Server Component or it goes through an API route.
4. **Update `firestore.rules`/`storage.rules`/`firestore.indexes.json` in the same change** as any schema change (new field driving a new query shape, new collection, new ownership check) — these are deployed manually via the Firebase CLI or console, not by CI, so a change that needs a new composite index will work in tests (which mock Firestore) and then fail against the real project until someone deploys the index.
5. **Run `npm run build`, not just `npm test`, before you call something done** — see above.
6. **Don't fabricate test/pilot data.** `docs/business-tech-note.md`'s "Customer Insight" section is explicitly a testing plan, not results, because no pilot has run yet. Don't backfill it with invented numbers, quotes, or outcomes.
7. **Commit messages**: follow the existing style — present-tense, one-line summary, body explaining *why* when the change fixes a non-obvious bug (see `git log` for examples). Don't add AI attribution footers unless the project's own conventions (checked at commit time) ask for them.
8. **Secrets never go in the repo.** `.env.local` is gitignored; the deploy key lives only as a GitHub Actions secret (`DEPLOY_SSH_KEY`) and in the server's `authorized_keys`, never in this repo.

## Where the history lives

`docs/superpowers/plans/` has the two implementation plans this app was built from (`2026-11-13-wordbook-webapp-v2.md` for the original Supabase build, `2026-11-14-wordbook-firebase-port.md` for the Firebase port) — each has a "Rulings" section documenting every non-obvious design decision and why, plus a "Review Focus" section naming the specific risk areas that were checked. Worth reading before touching the data model or auth flow.

`docs/superpowers/specs/2026-11-15-wordbook-v3-design.md` is the design doc (not yet a plan) for the v3 redesign described in the callout at the top of this file — read it for the reasoning behind any upcoming change to the data model, sectioning, or the tab structure before a v3 implementation plan exists in `docs/superpowers/plans/`.
