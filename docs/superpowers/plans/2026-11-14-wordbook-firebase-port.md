# WordBook Firebase Backend Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every Supabase-specific piece of the just-merged WordBook app (Postgres via `@supabase/supabase-js`, Supabase Auth, Supabase Storage) with Firebase equivalents (Firestore, Firebase Authentication, Firebase Storage), with **zero change to product behavior**. Every fix and finding from the Supabase build's review process (the C1 zero-vocabulary-unlock fix, the I1 locked-section guard, the I4 tap/Add split, the I9 `/review` exception for reader-added words, etc.) must carry over intact.

**Architecture:** Firebase Admin SDK only, server-side (Next.js Server Components and Route Handlers) — the app never talks to Firestore directly from the browser, mirroring how the Supabase build only used the server-side Supabase client. The Firebase *client* SDK is used in exactly one place: the browser-side sign-in/sign-up forms, to obtain an ID token, which is then exchanged for an httpOnly session cookie via a dedicated API route — Firestore Security Rules are therefore a defense-in-depth layer, not the primary enforcement; the primary enforcement is the explicit `userId` equality check every Admin SDK query/mutation in app code already performs (same pattern the Supabase build used despite having RLS).

**Tech Stack:** Next.js 15 (App Router) + TypeScript 5 (unchanged), `firebase` (client SDK, auth-only) + `firebase-admin` (server SDK, Firestore + Storage + session cookies), Tailwind CSS 3 (unchanged). All pure business logic — `lib/text/*`, `lib/dictionary/dictionaryApi.ts`, `lib/epub/parseEpub.ts`, `lib/srs/sm2.ts` — is backend-agnostic and is **not touched by this plan**.

**Spec:** `docs/web-app-prompt.md` (the original product brief — product behavior is unchanged) and the prior plan, `docs/superpowers/plans/2026-11-13-wordbook-webapp-v2.md` (the Supabase implementation this plan ports from — every one of its Rulings and every finding from its final review and fix wave is the baseline this plan must preserve).

## Rulings (plan-author decisions)

1. **Firestore, not Realtime Database.** Firestore's structured queries and per-document security rules are the closer match to the Postgres model being replaced; Realtime Database's flat JSON-tree model would make the per-user `words`/`sections` scoping much harder to express safely.
2. **Data model.** `books/{bookId}` (top-level collection) with a `sections` **subcollection**: `books/{bookId}/sections/{sectionId}`. `words/{wordId}` is a **top-level** collection (words are deduped per-user independent of any one book, matching the Supabase `unique(user_id, word)` constraint) — **document ID is deterministic: `${userId}_${word}`**, not an auto-ID. This lets word creation use the Admin SDK's `.create()` (which fails with a documented `already-exists` error if the doc exists) as a race-safe, atomic "insert only if genuinely new" primitive — strictly better than the Supabase build's select-then-insert pattern, and it also resolves that build's documented M8 double-add race natively: the loser of a race just gets `already-exists` and the code re-fetches the winner's doc instead of erroring.
3. **No `section_words` join collection.** Firestore has no joins. Replaced with two denormalized arrays, written together in one batch: `sections/{sectionId}.wordIds: string[]` (a section's member words) and `words/{wordId}.sectionRefs: { bookId: string; sectionId: string }[]` (every section a word belongs to, needed by the rate route to call `maybeUnlockNextSection` for each one — the same loop the Supabase build's rate route already does via its `section_words` query).
4. **Auth: Firebase session cookies, not ID-token-per-request.** The browser signs in via the Firebase **client** SDK (`signInWithEmailAndPassword`/`createUserWithEmailAndPassword`), gets an ID token, and POSTs it to `app/api/auth/session/route.ts`, which uses the Admin SDK's `createSessionCookie` to set an httpOnly cookie — this is Firebase's own documented pattern for SSR frameworks and is the closest match to how Supabase's `@supabase/ssr` cookie-based session worked.
5. **Middleware does a cheap cookie-presence check only** (redirect to `/login` if the session cookie is absent) — it does NOT call `verifySessionCookie` (that requires Node's crypto APIs, which Next.js Edge middleware does not reliably support). Each protected page/route performs the real verification server-side via `lib/firebase/server.ts`'s `getAuthedUser()`, mirroring exactly how the Supabase build called `supabase.auth.getUser()` in every protected page/route despite middleware already refreshing the session.
6. **Storage path convention unchanged**: EPUB uploads go to `epubs/{userId}/{uuid}.epub` in the default Firebase Storage bucket, mirroring the Supabase build's path convention so the Storage Security Rules read the same way.
7. **Deployment target unchanged.** Firebase is used purely as a backend-as-a-service (Firestore + Auth + Storage) — the Next.js app itself still self-hosts on the existing VPS (`systemd` + `nginx`), not Firebase Hosting/App Hosting. This plan does not touch deployment.
8. **Every fix from the Supabase build's review process is a hard requirement, not optional.** Specifically: C1 (zero-vocabulary sections must still trigger the unlock check), I1 (a `locked` section must never be skipped straight to `ready_to_read`), I2 (tokenizer/entity fixes — unaffected, pure-logic module, not touched), I3 (header nav + reader prev/next — unaffected, no Supabase dependency, not touched), I4 (tap is read-only; only the "Add" action inserts; a stored-null definition is retried), I5 (popup close button — unaffected, not touched), I6 (dictionary fetch timeout + concurrency cap — unaffected, not touched), I7 (in-flight rating-button guard — unaffected, client-only, not touched), I9 (the `/review` page excludes never-rated words EXCEPT ones with no `bookId`, i.e. reader-added words). Each relevant task below names which of these it's responsible for carrying forward.

## Global Constraints

- Firebase Admin SDK (`firebase-admin`) is the only thing that talks to Firestore/Storage; it runs exclusively in Server Components and Route Handlers (Node runtime).
- The Firebase client SDK (`firebase`) is used only in `app/login/page.tsx` and `app/signup/page.tsx`, only for obtaining an ID token — never for Firestore reads/writes.
- Every Firestore query that returns user-owned data filters explicitly by the authenticated `userId` in app code, even though Firestore Security Rules also enforce it — defense in depth, matching the Supabase build's own documented pattern.
- Word document IDs are always `${userId}_${word}` (both exactly as produced by `normalizeWord`/`extractVocabulary` — lowercase, already-normalized). Never use Firestore auto-IDs for `words`.
- `sections` are always addressed via their parent book: `books/{bookId}/sections/{sectionId}`. Never create a top-level `sections` collection.
- Tests must not require a live Firebase project — mock `firebase-admin`'s Firestore/Auth/Storage clients (see each task's Interfaces block for the exact mocking shape to follow, consistent across tasks).
- Every behavior change from the Supabase build's final review and fix wave (the 8 items in Ruling 8) must have an equivalent passing test in this port — not just "the old test still exists," but a real test against the new Firestore-backed code path.
- Keep `vitest.config.ts`, `vitest.setup.ts`, `tsconfig.json`'s `@/*` alias, and Tailwind config exactly as they are — no changes needed.

## Review Focus

1. **The C1 zero-vocabulary-unlock fix must survive the port.** A section with an empty `wordIds` array must still trigger `maybeUnlockNextSection` from the practice page, not just from the rate route (which never fires for a wordless section).
2. **The I1 locked-section guard must survive the port.** `maybeUnlockNextSection` must refuse to act on a section whose `status` is `locked`.
3. **Word-creation races must be provably atomic now, not just "unlikely to corrupt."** A test must prove that two concurrent attempts to create the same new word (same deterministic ID) result in exactly one document, with the loser transparently receiving the winner's existing data — this is the Ruling 2 improvement over the Supabase build's design, and it needs a real concurrent-call test, not just a happy-path test.
4. **The I9 exception (reader-added words with no `bookId` still appear on `/review`) must survive the port**, expressed as a Firestore query condition, not a Postgres `.or()` clause.
5. **Firestore composite-index requirements must be caught at plan-time, not discovered at runtime.** Any query combining a range/inequality filter (e.g. `nextReviewDate <= today`) with another filter or an `orderBy` on a different field requires a composite index in Firestore, and such a query throws a runtime error (with a console-logged index-creation link) if the index doesn't exist — unlike Postgres, there's no implicit index. Each task touching such a query must note the exact index it needs in its own section, and Task 1 must list all of them together so they can be created via `firestore.indexes.json` (deployed alongside the rules) rather than discovered one at a time against a live project.

---

## File Structure

Removed entirely: `lib/supabase/` (both files + test), `middleware.ts` (rewritten), `supabase/migrations/0001_init.sql` (replaced by `firestore.rules` + `storage.rules` + `firestore.indexes.json`).

Rewritten (same file path, new implementation): `lib/books/bookService.ts`(+test), `lib/sections/sectionService.ts`(+test), `middleware.ts`, `app/login/page.tsx`, `app/signup/page.tsx`, `app/settings/page.tsx`, `app/library/page.tsx`, `app/book/[id]/page.tsx`, `app/book/[id]/practice/[sectionNumber]/page.tsx`(+test), `app/book/[id]/read/[sectionNumber]/page.tsx`(+test), `app/review/page.tsx`(+test), `app/api/books/route.ts`(+test), `app/api/words/lookup/route.ts`(+test), `app/api/words/[wordId]/rate/route.ts`(+test).

New: `lib/firebase/admin.ts` (Admin SDK init), `lib/firebase/client.ts` (client SDK init, auth-only), `lib/firebase/server.ts` (`getAuthedUser()`), `app/api/auth/session/route.ts`, `firestore.rules`, `storage.rules`, `firestore.indexes.json`.

Untouched (no Supabase/Firestore dependency, confirmed by grep before writing this plan): every file in `components/`, `lib/text/*`, `lib/dictionary/*`, `lib/epub/*`, `lib/srs/*`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `tailwind.config.ts`, `postcss.config.mjs`.

---

### Task 1: Scaffold — Firebase SDKs, security rules, indexes, auth helpers, middleware

**Files:**
- Delete: `lib/supabase/client.ts`, `lib/supabase/client.test.ts`, `lib/supabase/server.ts`, `supabase/migrations/0001_init.sql` (and the empty `supabase/` dir)
- Modify: `package.json`, `.env.local.example`, `.gitignore`, `middleware.ts`
- Create: `lib/firebase/admin.ts`, `lib/firebase/client.ts`, `lib/firebase/server.ts`, `firestore.rules`, `storage.rules`, `firestore.indexes.json`
- Test: `lib/firebase/server.test.ts`

**Interfaces:**
- Produces: `getAdminApp()` in `lib/firebase/admin.ts` (lazily-initialized singleton, reads service-account credentials from `FIREBASE_PROJECT_ID`/`FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY` env vars); `getFirebaseClientConfig()` in `lib/firebase/client.ts` (reads `NEXT_PUBLIC_FIREBASE_*` env vars, used only by login/signup); `async getAuthedUser(): Promise<{ uid: string } | null>` in `lib/firebase/server.ts` — reads the session cookie via `next/headers`' `cookies()`, verifies it with the Admin SDK's `getAuth(getAdminApp()).verifySessionCookie(cookie, true)`, returns `{ uid }` on success or `null` on any failure (expired, missing, invalid — never throws). Every later task's protected page/route calls this exactly once, by this name, from this path — mirrors the old `createClient()` + `auth.getUser()` two-step as a single call.

- [ ] **Step 1: Remove Supabase-specific files**

```bash
git rm -r lib/supabase supabase
```

- [ ] **Step 2: Rewrite `package.json`**

Remove `@supabase/supabase-js`, `@supabase/ssr`. Add dependencies `firebase` and `firebase-admin`. Leave every other dependency, script, and field unchanged.

- [ ] **Step 3: Rewrite `.env.local.example`**

```
# Firebase Admin SDK (server-side; from your Firebase project's service account JSON)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Firebase client SDK (browser; from your Firebase project's web app config) — auth only, never used for Firestore
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
```

- [ ] **Step 4: Write `firestore.rules`**

Defense-in-depth only (the app's own Admin SDK calls bypass these; they protect against any future direct client access):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /books/{bookId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;

      match /sections/{sectionId} {
        allow read, write: if request.auth != null &&
          get(/databases/$(database)/documents/books/$(bookId)).data.userId == request.auth.uid;
      }
    }

    match /words/{wordId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

- [ ] **Step 5: Write `storage.rules`**

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /epubs/{userId}/{fileName} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

- [ ] **Step 6: Write `firestore.indexes.json`**

Document every composite index this plan's queries need (populated as later tasks are written — for this task, list the one Task 10 (`/review`) needs: a collection-group-free query on top-level `words` filtering by `userId` (equality) + `nextReviewDate` (range) + `bookId`/`lastRating` — **note this as a placeholder index entry now**; Task 10 finalizes its exact field list once that query's shape is locked in). Content:

```json
{
  "indexes": [
    {
      "collectionGroup": "words",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "nextReviewDate", "order": "ASCENDING" }
      ]
    }
  ]
}
```

- [ ] **Step 7: Implement `lib/firebase/admin.ts`**

```ts
export function getAdminApp(): App // firebase-admin's App type
```
Body: check `getApps().length` (from `firebase-admin/app`) and return the existing app if already initialized (Next.js hot-reload/multiple-import safety); otherwise `initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') }) })` — the `replace(/\\n/g, '\n')` is necessary because the private key's newlines get escaped when stored as a single-line env var.

- [ ] **Step 8: Implement `lib/firebase/client.ts`**

```ts
export function getFirebaseClientApp(): FirebaseApp
```
Body: same hot-reload-safe singleton pattern using `getApps()`/`initializeApp()` from `firebase/app`, config object built from the four `NEXT_PUBLIC_FIREBASE_*` env vars.

- [ ] **Step 9: Write the failing test for `getAuthedUser`**

```ts
// lib/firebase/server.test.ts
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({ getAdminApp: vi.fn(() => ({})) }));
vi.mock('firebase-admin/auth', () => ({ getAuth: vi.fn() }));

test('returns the uid when the session cookie verifies', async () => { /* mock cookies().get('session')?.value, mock getAuth().verifySessionCookie resolving { uid: 'user-1' }, assert getAuthedUser() resolves { uid: 'user-1' } */ });
test('returns null when there is no session cookie', async () => { /* cookies().get returns undefined, assert null, verifySessionCookie never called */ });
test('returns null when verification throws (expired/invalid cookie)', async () => { /* verifySessionCookie rejects, assert null, not a thrown error */ });
```

- [ ] **Step 10: Run tests to verify they fail, then implement `getAuthedUser`**

- [ ] **Step 11: Rewrite `middleware.ts`**

Cheap cookie-presence check only (Ruling 5): if the request path matches a protected prefix (`/library`, `/book`, `/review`, `/settings`) and there's no `session` cookie, redirect to `/login`. Otherwise `NextResponse.next()`. Same matcher exclusions as before (`_next/static`, `_next/image`, favicon, static image extensions).

- [ ] **Step 12: Run full suite and typecheck**

Run: `npm install && npm test && npm run typecheck`
Expected: passes (no file anywhere still imports `@/lib/supabase/*`).

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "chore: swap Supabase scaffold for Firebase Admin/client SDKs, security rules, auth helper"
```

---

### Task 2: Auth — session cookie route, login/signup/settings pages

**Files:**
- Create: `app/api/auth/session/route.ts`
- Modify: `app/login/page.tsx`, `app/signup/page.tsx`, `app/settings/page.tsx`
- Test: `app/api/auth/session/route.test.ts`

**Interfaces:**
- Consumes: `getAdminApp` (Task 1), `getFirebaseClientApp` (Task 1), `getAuthedUser` (Task 1).
- Produces: `POST /api/auth/session` with body `{ idToken: string }` → sets an httpOnly `session` cookie (via `createSessionCookie`), returns 204. `DELETE /api/auth/session` → clears the cookie, returns 204. Every other protected page in this plan calls `getAuthedUser()` to read the identity this route establishes.

- [ ] **Step 1: Write failing tests for the session route**

```ts
test('POST exchanges a valid idToken for a session cookie', async () => { /* mock getAuth().createSessionCookie resolving 'cookie-value', POST { idToken: 'abc' }, assert response sets a Set-Cookie header named session, httpOnly */ });
test('POST returns 401 when createSessionCookie rejects (invalid/expired idToken)', async () => { /* mock rejection, assert 401, no cookie set */ });
test('DELETE clears the session cookie', async () => { /* assert response's Set-Cookie clears/expires the session cookie */ });
```

- [ ] **Step 2: Run tests to verify they fail, then implement the route**

`POST`: parse `{ idToken }` from the body (400 if missing/malformed, mirroring the existing malformed-body guard pattern in `app/api/words/[wordId]/rate/route.ts`); call `getAuth(getAdminApp()).createSessionCookie(idToken, { expiresIn: 1000 * 60 * 60 * 24 * 14 })` (14-day expiry, a reasonable default); on success, set the cookie via `(await cookies()).set('session', cookie, { httpOnly: true, secure: true, maxAge: ..., path: '/' })` and return 204; on rejection, return 401. `DELETE`: `(await cookies()).delete('session')`, return 204.

- [ ] **Step 3: Run tests to verify they pass**

- [ ] **Step 4: Rewrite `app/login/page.tsx` and `app/signup/page.tsx`**

Client components (`'use client'`). On submit: call `signInWithEmailAndPassword`/`createUserWithEmailAndPassword` (from `firebase/auth`, using `getAuth(getFirebaseClientApp())`) with the form's email/password; on success, call `userCredential.user.getIdToken()`, POST it to `/api/auth/session`, then `router.push('/library')`; on any failure (either Firebase Auth's own rejection or the session-route POST failing), show the error message. No test required (mirrors the Supabase build's untested client-form pages, same risk profile).

- [ ] **Step 5: Rewrite `app/settings/page.tsx`**

Server component: `const user = await getAuthedUser(); if (!user) redirect('/login');` (same pattern as every other protected page). To show the email, either store it from the session cookie's decoded claims (`verifySessionCookie`'s return value includes `email`) by having `getAuthedUser()` optionally return it, OR fetch it via `getAuth(getAdminApp()).getUser(uid)` — **your call, pick whichever is simpler; if you extend `getAuthedUser`'s return type, update Task 1's Interfaces note and every other caller accordingly (there should be none yet when you reach this task, since Task 1 is the only prior consumer and it only checks truthiness).** Sign-out: a form posting to a server action or route that calls `DELETE /api/auth/session` client-side then `router.push('/login')` — simplest is a small inline client component for just the sign-out button, with the rest of the page server-rendered.

- [ ] **Step 6: Run full suite and typecheck**

- [ ] **Step 7: Commit**

```bash
git add app/api/auth app/login app/signup app/settings
git commit -m "feat: Firebase session-cookie auth, rewritten login/signup/settings pages"
```

---

### Task 3: Book ingestion service + route

**Files:**
- Modify: `lib/books/bookService.ts`, `lib/books/bookService.test.ts`, `app/api/books/route.ts`, `app/api/books/route.test.ts`

**Interfaces:**
- Consumes: `splitIntoSections`, `extractVocabulary`, `fetchDefinition`, `parseEpub` (all unchanged, pure), `getAdminApp` (Task 1).
- Produces: same signature as the Supabase version — `addBook(input: { title: string; author?: string; format: 'text' | 'epub'; rawText: string; userId: string }): Promise<{ bookId: string }>` (no `supabase` client parameter anymore — the Admin SDK's Firestore instance is obtained internally via `getFirestore(getAdminApp())`, there is no per-request client to pass in, unlike the Supabase build).

- [ ] **Step 1: Write failing tests for `addBook`**

Mock `firebase-admin/firestore`'s `getFirestore` to return a fake Firestore instance backed by in-memory maps (`collection`/`doc`/`get`/`set`/`create`/`update`/`batch` implemented against plain JS objects — follow the same "fake the chain, back it with real in-memory state" philosophy the Supabase build's tests used, adapted to Firestore's API shape). Test cases:

```ts
test('creates a book doc, one section subcollection doc per 150 words, section 1 ready_to_practice, rest locked', async () => { /* assert the sections subcollection's docs */ });
test('a brand-new word is created with the deterministic id `${userId}_${word}` and SM-2 defaults', async () => { /* assert doc id, fields */ });
test('an existing word (same deterministic id) is reused via .create() failing with already-exists, re-fetched, NOT overwritten — definition and SM-2 state survive re-extraction by a new book', async () => { /* this is the Supabase build's Task 7 regression test, ported */ });
test('two concurrent addBook calls creating the same new word result in exactly one document, and the losing call still gets a usable word id', async () => { /* Review Focus #3 — simulate the race by having the fake .create() throw already-exists for the second caller and assert it falls back to .get() */ });
test('a dictionary lookup failure for one word does not abort extraction for the rest of the section', async () => { /* ported from the Supabase build */ });
test('each word doc\'s sectionRefs and each section doc\'s wordIds are updated together for every word/section pair', async () => { /* Ruling 3 */ });
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement `addBook`**

Steps: create the `books/{bookId}` doc (auto-ID is fine here — books aren't deduped like words); for each `splitIntoSections` result, create a `books/{bookId}/sections/{sectionId}` doc (auto-ID; `status: index === 0 ? 'ready_to_practice' : 'locked'`, `wordIds: []` initially); for each section's `extractVocabulary` candidates, resolve each word's doc id as `` `${userId}_${word}` ``; for each, attempt `wordsCollection.doc(wordId).create({...SM-2 defaults, definition})` — **note**: calling `fetchDefinition` for every candidate before attempting `.create()` is wasteful for words that already exist; instead, first try `.create()` with definition `null` is wrong too (brief says always resolve a definition on creation) — **the right order**: `get()` the doc first to check existence (cheap, no write), and only call `fetchDefinition` + `.create()` for the ones that don't exist; for ones that do exist, just read their current `definition`/id and move on (no write at all) — this is actually simpler than attempting-then-catching for the common case, while Review Focus #3's concurrent-race test still exercises the catch-`already-exists`-and-refetch path for the genuine race (two callers both see "doesn't exist" and both attempt create; only one wins). Then batch-update: for each section, set its `wordIds` array (all word ids, new and existing) via `arrayUnion`-equivalent (`sectionRef.update({ wordIds: FieldValue.arrayUnion(...ids) })`), and for each word, append this section's `{bookId, sectionId}` to its `sectionRefs` via `FieldValue.arrayUnion(...)`.

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Update `app/api/books/route.ts`**

Replace `createClient()`/`supabase.auth.getUser()` with `getAuthedUser()` (Task 1). Replace the Supabase Storage upload (`supabase.storage.from('epubs').upload(...)`) with `getStorage(getAdminApp()).bucket().file(`epubs/${userId}/${uuid}.epub`).save(buffer)`. Keep every other behavior identical: parse-before-upload ordering, upload-error logged not fatal, 400 on empty title/rawText or wrong extension, 400 on unparseable EPUB.

- [ ] **Step 6: Run both test files, typecheck**

- [ ] **Step 7: Commit**

```bash
git add lib/books app/api/books
git commit -m "feat: port book ingestion to Firestore (deterministic word ids, race-safe create)"
```

---

### Task 4: Section service — recognition rate + unlock logic

**Files:**
- Modify: `lib/sections/sectionService.ts`, `lib/sections/sectionService.test.ts`

**Interfaces:**
- Produces: `computeRecognitionRate` — **unchanged, pure function, copy verbatim** (it takes `{ lastRating: string | null }[]`, no Firestore dependency, no porting needed). `async maybeUnlockNextSection(bookId: string, sectionId: string): Promise<void>` — note the signature drops the `supabase` client parameter (same reasoning as Task 3's `addBook`).

- [ ] **Step 1: Write failing tests** (port every test from the Supabase build's `sectionService.test.ts`, adapted to Firestore mocking)

```ts
test('unlocks reading for this section and practice for the next when the rate crosses 80%', async () => {});
test('does nothing when the rate is below 80%', async () => {});
test('I1: does nothing when the target section is locked (never advances locked -> ready_to_read)', async () => {}); // ported from the Supabase build's fix-wave test
test('a zero-wordIds section auto-passes at rate 1.0 and still unlocks (C1 path)', async () => {});
test('does not relock or re-unlock a section already past ready_to_read/completed', async () => {});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement `maybeUnlockNextSection`**

Read `books/{bookId}/sections/{sectionId}`; if its `status` is not `ready_to_practice`, return (covers both the I1 locked-guard and the already-advanced idempotency case in one check, same as the Supabase version's logic). Fetch each id in `wordIds` via `Promise.all` of `words/{id}.get()`, map to `{ lastRating }`, call `computeRecognitionRate`. If `< 0.8`, return. Otherwise: update this section's `status` to `ready_to_read`; query `books/{bookId}/sections` where `sectionNumber == thisSectionNumber + 1` (`.where('sectionNumber', '==', n+1).limit(1).get()`); if found and its `status` is `locked`, update it to `ready_to_practice`.

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add lib/sections
git commit -m "feat: port section recognition-rate and unlock logic to Firestore"
```

---

### Task 5: Rate route

**Files:**
- Modify: `app/api/words/[wordId]/rate/route.ts`, `app/api/words/[wordId]/rate/route.test.ts`

**Interfaces:**
- Consumes: `applyRating` (unchanged), `maybeUnlockNextSection(bookId, sectionId)` (Task 4), `getAuthedUser` (Task 1).

- [ ] **Step 1: Write failing tests** (port every test from the Supabase build, including the fix-wave ones)

```ts
test('applies the rating, persists the new state, and triggers unlock checks for every section in sectionRefs', async () => {});
test('rating an unknown or not-owned wordId returns 404', async () => {});
test('returns 400 for a rating outside again/hard/good/easy, before any write', async () => {});
test('an unlock-check failure after a successful word update is logged, not returned as an error (no double-apply risk on client retry)', async () => {});
test('a malformed request body returns 400, not 500', async () => {});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement the route**

`getAuthedUser()` (401 if none); validate `rating` against the four allowed values (400 before any read); fetch `words/{wordId}`, 404 if missing or its `userId` doesn't match the authed uid; map its fields to `applyRating`'s camelCase input (field names are already camelCase in Firestore, so this mapping is simpler than the Supabase build's snake_case translation — just pass the fields through); call `applyRating`; `update()` the word doc with the new state; for each entry in the word's `sectionRefs`, call `maybeUnlockNextSection(bookId, sectionId)` inside a try/catch that logs failures without failing the response (ported from the fix wave).

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add app/api/words/[wordId]/rate
git commit -m "feat: port the rate route to Firestore"
```

---

### Task 6: Word-lookup route

**Files:**
- Modify: `app/api/words/lookup/route.ts`, `app/api/words/lookup/route.test.ts`

**Interfaces:**
- Consumes: `fetchDefinition`, `normalizeWord` (unchanged), `getAuthedUser` (Task 1).

- [ ] **Step 1: Write failing tests** (port every test from the Supabase build, including the I4 fix-wave ones)

```ts
test('a plain lookup (no add flag) never creates a word doc, even for a brand-new word', async () => {});
test('add: true creates a new word doc with SM-2 defaults and no bookId/sectionRefs', async () => {});
test('a stored null definition is retried and backfilled without touching SRS state', async () => {});
test('two concurrent add:true calls for the same new word result in one document; the loser transparently gets the winner\'s data instead of a 500', async () => {}); // Review Focus #3 + the Ruling 2 improvement over the Supabase build's M8 race
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement the route**

Same overall shape as the Supabase build's post-I4-fix version: compute the deterministic doc id; `get()` it first — if it exists and `definition` is non-null, return it as-is; if it exists with a null `definition`, retry `fetchDefinition` and `update()` only the `definition` field if the retry succeeds; if it doesn't exist, call `fetchDefinition` and, only when `add === true`, attempt `.create()` with SM-2 defaults — **on an `already-exists` error from that `.create()` call (the race case), re-`get()` the doc and return its data instead of surfacing an error** (the Ruling 2 improvement); when `add` is not `true` and the word doesn't exist, just return the freshly-fetched definition without writing anything.

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add app/api/words/lookup
git commit -m "feat: port the word-lookup route to Firestore, with a race-safe add path"
```

---

### Task 7: Library page + book detail page

**Files:**
- Modify: `app/library/page.tsx`, `app/book/[id]/page.tsx`

**Interfaces:**
- Consumes: `getAuthedUser` (Task 1). No test required for either (both were untested server components in the Supabase build too — thin query + render, same risk profile).

- [ ] **Step 1: Rewrite `app/library/page.tsx`**

`getAuthedUser()`, redirect to `/login` if none; query `books` where `userId == uid`, render `<AddBookForm />` (unchanged component) plus the list linking to `/book/[id]`.

- [ ] **Step 2: Rewrite `app/book/[id]/page.tsx`**

`await params` (unchanged Next 15 convention); `getAuthedUser()`, redirect if none; fetch `books/{id}`, `notFound()` if missing or not owned (port the Supabase build's exact guard — this was a self-flagged, reviewer-confirmed-correct addition in that build, carry it forward); fetch `books/{id}/sections` ordered by `sectionNumber`; render each with `SectionStatusBadge` (unchanged component) and the same status-based linking logic as before.

- [ ] **Step 3: Run full suite, typecheck**

- [ ] **Step 4: Commit**

```bash
git add app/library app/book/\[id\]/page.tsx
git commit -m "feat: port library and book detail pages to Firestore"
```

---

### Task 8: Practice page

**Files:**
- Modify: `app/book/[id]/practice/[sectionNumber]/page.tsx`, `app/book/[id]/practice/[sectionNumber]/page.test.tsx`

**Interfaces:**
- Consumes: `maybeUnlockNextSection` (Task 4), `getAuthedUser` (Task 1). `PracticeSession` (unchanged component).

- [ ] **Step 1: Write failing tests** (port every test from the Supabase build, this page carries the most fix-wave history of any page — C1 and the locked-section guard both live here)

```ts
test('shows every word in the section regardless of next_review_date (no due-date filter on this page)', async () => {});
test('redirects to the book page when the section is locked', async () => {});
test.each(['ready_to_practice', 'ready_to_read', 'completed'])('does not redirect when status is %s', async () => {});
test('C1: a zero-word section runs the unlock check and redirects to the book page when it unlocks', async () => {});
test('C1: a zero-word section that does not unlock renders normally', async () => {});
test('a section with words never calls the unlock check (only the rate route does)', async () => {});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement the page**

`await params`; `getAuthedUser()`, redirect if none; fetch `books/{id}` (404/ownership guard, same as Task 7); fetch `books/{id}/sections` where `sectionNumber == N`, `.limit(1)`; redirect to `/book/[id]` if `status === 'locked'`; if `wordIds.length === 0`, call `maybeUnlockNextSection(bookId, sectionId)`, re-fetch the section, and redirect to `/book/[id]` if its status changed (the C1 fix, ported); otherwise fetch each word in `wordIds` via `Promise.all`, render `<PracticeSession words={...} .../>`.

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add app/book/\[id\]/practice
git commit -m "feat: port the practice page to Firestore, preserving the C1 and locked-section fixes"
```

---

### Task 9: Reader page

**Files:**
- Modify: `app/book/[id]/read/[sectionNumber]/page.tsx`, `app/book/[id]/read/[sectionNumber]/page.test.tsx`

**Interfaces:**
- Consumes: `getAuthedUser` (Task 1). `WordPopup` (unchanged component).

- [ ] **Step 1: Write failing tests** (port every test from the Supabase build)

```ts
test('redirects to the book page unless the section status is ready_to_read or completed', async () => {});
test('renders the section text with each word wrapped for tap-to-define', async () => {});
test('shows prev/next navigation per the I3 fix', async () => {});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement the page**

Same structure as Task 8's ownership/params handling; fetch the section, redirect unless `ready_to_read`/`completed`; render the book's `rawText` slice for this section's `startWordIndex`/`endWordIndex` range, each word wrapped in `WordPopup`; prev/next links exactly as the Supabase build's I3 fix implemented them (back-to-book, next-section-if-unlocked).

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add app/book/\[id\]/read
git commit -m "feat: port the reader page to Firestore"
```

---

### Task 10: Global review page

**Files:**
- Modify: `app/review/page.tsx`, `app/review/page.test.tsx`, `firestore.indexes.json`

**Interfaces:**
- Consumes: `getAuthedUser` (Task 1). `PracticeSession` (unchanged component).

- [ ] **Step 1: Write failing tests** (port every test from the Supabase build, including the I9 regression-fix test)

```ts
test('I9 regression: a word added via "Add to my vocabulary" (no bookId, never rated) still appears', async () => {});
test('a never-rated word that DOES belong to a book is excluded', async () => {});
test('a rated word from a book still appears', async () => {});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement the page, and finalize `firestore.indexes.json`**

The Supabase build's filter was `next_review_date <= today AND (last_rating IS NOT NULL OR book_id IS NULL)` — Firestore cannot express an OR of two different-field conditions in a single query as cleanly as PostgREST's `.or()`. The straightforward port: run the inequality filter (`nextReviewDate <= today`) with `userId == uid` as the only compound query, fetch the matching docs, and apply the `lastRating !== null || bookId === null` filter **in application code** on the result set rather than in the query itself — Firestore does support this as two merged queries (`where('lastRating', '!=', null)` unioned with `where('bookId', '==', null)`, each additionally filtered by `userId` and the date range), but a single `userId`-scoped range query followed by an in-memory filter is simpler, equally correct at this app's scale, and avoids a second composite index — **make this call yourself; if you choose the two-query union instead, add its index to `firestore.indexes.json` and say so in your commit message.** Update `firestore.indexes.json`'s `words` index entry to match whichever query shape you land on.

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add app/review firestore.indexes.json
git commit -m "feat: port the global review page to Firestore, preserving the I9 exception"
```

---

### Task 11: README + final verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Rewrite the setup section of `README.md`**

Replace the Supabase project/migration instructions with: create a Firebase project, enable Firestore (production mode) + Authentication (email/password provider) + Storage, generate a service-account key (Project Settings → Service Accounts → Generate new private key) for the three `FIREBASE_*` env vars, copy the web app config for the three `NEXT_PUBLIC_FIREBASE_*` vars, deploy `firestore.rules`/`storage.rules`/`firestore.indexes.json` via the Firebase CLI (`firebase deploy --only firestore:rules,firestore:indexes,storage`). Keep every other section (known decisions, backlog items, limits) — update any line that still describes Supabase/Postgres/RLS specifics to describe the Firestore/Security-Rules equivalent instead; the actual documented decisions (the 8 Rulings from the prior plan, the backlog items) are otherwise unchanged in substance.

- [ ] **Step 2: Run the full suite and typecheck one final time**

Run: `npm test && npm run typecheck`
Expected: all pass, zero type errors, and `grep -rl supabase .` (excluding `node_modules`, `.git`, `package-lock.json`, and this plan/the prior plan's own docs) returns nothing.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: rewrite README setup instructions for Firebase"
```
