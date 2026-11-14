# WordBook

WordBook is an account-based web app for learning vocabulary from the books you're actually reading. Add a book (paste text, upload a `.txt`, or upload an `.epub`), and WordBook splits it into fixed 150-word sections and pulls out the non-common words in each one. Before you can read a section you have to practice its vocabulary as SM-2 flashcards (with free dictionary definitions and browser text-to-speech pronunciation); once you recognize at least 80% of a section's words, it unlocks for reading, and tapping any word while reading shows its definition — clicking "Add to my vocabulary" adds it to your review queue. A global `/review` page surfaces every word across every book that's due for spaced-repetition review today.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript 5**
- **Firebase** — Firestore (data), Authentication (email/password), Storage (uploaded EPUB files)
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

2. **Create a Firebase project**

   Create a new project at the [Firebase console](https://console.firebase.google.com). Firestore and Authentication are available on the free Spark tier. **Storage is not**: since late 2024, Firebase requires the Blaze (pay-as-you-go) plan to create a new project's default Cloud Storage bucket — on Spark, step 2's "enable Storage" below will be blocked. Blaze has its own free-usage tier, so a small project like this one should still cost nothing in practice, but the project must be upgraded to Blaze before Storage can be enabled. In the new project, enable:

   - **Firestore** (Build → Firestore Database → Create database, in production mode)
   - **Authentication** (Build → Authentication → Get started → enable the Email/Password sign-in provider)
   - **Storage** (Build → Storage → Get started, default bucket — requires the Blaze plan, see above)

3. **Deploy the security rules and indexes**

   This repo's `firestore.rules`, `storage.rules`, and `firestore.indexes.json` are self-contained — no manual rule/index entry via the console is needed. `firebase.json` (which maps those files to CLI deploy targets) is already committed, so there's no need to run `firebase init`. With the [Firebase CLI](https://firebase.google.com/docs/cli) installed and logged in (`firebase login`), link the CLI to your project (`firebase use --add`) and deploy:

   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```

   The Firestore rules and the Storage rules scope every read/write to the authenticated user who owns the document/file; `firestore.indexes.json` creates the composite indexes the app's range queries need (e.g. `words` filtered by `userId` and ordered/filtered by `nextReviewDate`). These rules are a **live enforcement boundary, not a hypothetical one**: the web app's API key and project ID are public by design, and Email/Password sign-up is open, so anyone can obtain an ID token and call Firestore/Storage directly (via the client SDK or REST API) today, bypassing the app's own server-side code entirely. The app's own server-side code also talks to Firestore/Storage through the Admin SDK (server-side), which bypasses Security Rules and relies on its own explicit `userId` checks — but that is a second, independent layer, not a substitute for correct rules. See "Firestore Security Rules verification status" below.

4. **Configure environment variables**

   ```bash
   cp .env.local.example .env.local
   ```

   Fill in the seven values:

   ```
   FIREBASE_PROJECT_ID=
   FIREBASE_CLIENT_EMAIL=
   FIREBASE_PRIVATE_KEY=
   FIREBASE_STORAGE_BUCKET=
   NEXT_PUBLIC_FIREBASE_API_KEY=
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=
   ```

   - `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` come from a service-account key: Project Settings → Service Accounts → Generate new private key. That downloads a JSON file containing exactly these three fields (`project_id`, `client_email`, `private_key`) — copy them in as-is (keep the `private_key`'s `\n` escapes intact, quoting the value in `.env.local`).
   - `FIREBASE_STORAGE_BUCKET` is your default Storage bucket's name, shown on the Storage page in the console (`your-project-id.appspot.com` for older projects, `your-project-id.firebasestorage.app` for newer ones).
   - `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, and `NEXT_PUBLIC_FIREBASE_PROJECT_ID` come from the web app config: Project Settings → General → Your apps → add a Web app (or select the existing one) → the `firebaseConfig` snippet it shows you.

5. **Run the app**

   ```bash
   npm run dev
   ```

   Then visit `http://localhost:3000`, sign up for an account, and add a book from `/library`.

### Other scripts

```bash
npm test        # run the Vitest suite (mocks firebase-admin's Firestore/Auth/Storage clients and fetch — no live project needed)
npm run typecheck
npm run build
```

> **Note on this build:** the full manual end-to-end flow (sign up, add a multi-section book, practice a section to 80%, confirm it unlocks, read and tap-to-define, see the word on `/review`) has **not** been exercised against a real Firebase project as of this writing — no project credentials were available during implementation. Everything above is implemented and covered by the unit/integration test suite with mocked Firebase Admin SDK/fetch clients, but a first real run against a live project is still pending.

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

The spec left some implementation details open; these decisions were made while building the original (Supabase-backed) version and are documented in full in `docs/superpowers/plans/2026-11-13-wordbook-webapp-v2.md`. The app was later ported from Supabase to Firebase (Firestore + Firebase Authentication + Firebase Storage) with no change to product behavior; the Firebase-specific adaptations of these decisions are documented in full in `docs/superpowers/plans/2026-11-14-wordbook-firebase-port.md`:

1. **Denormalized arrays instead of a join table.** Firestore has no joins, so the original `section_words` join table (linking sections to their member words many-to-many) is replaced by two arrays written together in one batch: each section document's `wordIds: string[]` and each word document's `sectionRefs: { bookId, sectionId }[]`.
2. **Firestore Security Rules everywhere, as a live enforcement boundary.** Every collection (`books`, its `sections` subcollection, `words`) has rules scoped to `request.auth.uid`, even though the spec only implies per-user ownership rather than stating this explicitly. Because the web app's API key and project ID are public and sign-up is open, any user can call Firestore directly (client SDK or REST API) today — these rules are what stops that, not a hypothetical future concern. The app's own server-side code additionally talks to Firestore exclusively through the Admin SDK (which bypasses Security Rules) and performs its own explicit `userId` equality check on every query/mutation, as a second, independent layer. See "Firestore Security Rules verification status" below.
3. **`epub2` over `epubjs`** for EPUB parsing, since `epubjs` targets browser DOM/Blob APIs and parsing happens server-side in a Next.js API route.
4. **Tailwind CSS v3**, not v4, for tooling stability (the spec didn't pin a version).
5. **Firebase Storage holds raw uploaded `.epub` files** (under `epubs/{userId}/{uuid}.epub` in the default bucket) in addition to the flattened `rawText` stored in Firestore; pasted or `.txt` text never touches Storage.
6. **The common-words list is the first 1000 entries of the MIT-licensed `first20hours/google-10000-english` frequency list**, bundled as `lib/text/commonWords.json`.
7. **Recognition rating is global per word, not per book/section.** A word's `lastRating` is shared across every book it appears in, so mastering it in one book counts immediately toward another book's section unlock — matching the spec's own one-document-per-`(userId, word)` model (enforced via each word document's deterministic id, `${userId}_${word}`).
8. **The old local-JSON/OpenAI/MyMemory prototype was deleted outright** (`app/`, `components/`, `lib/`, `scripts/`, `data/` from the prior version) rather than migrated; `docs/business-tech-note.md` and `docs/runbook.md` are left untouched as historical record of that retired version.

### Firestore Security Rules verification status

The Security Rules (ruling 2 above) have only been **verified by code review**, not by an executed test. `firestore.rules` and `storage.rules` have been read carefully and appear correct — every collection/path the app uses is covered, scoped to `request.auth.uid`, document creates are bound to the authenticated uid (including the deterministic `words/{uid}_{word}` id scheme), updates are immutable on `userId`, and the `sections` subcollection denies client writes outright since the app never writes it from the client — but no automated test has run against a live Firebase project (or the Firebase emulator) with two different users to confirm one is actually denied access to the other's data. This matters now, not hypothetically: the web app's API key and project ID are public, and sign-up is open, so a real attacker could call Firestore/Storage directly today. The app's own server-side code additionally uses the Admin SDK (which bypasses Security Rules) and performs its own `userId` checks as a second, independent layer — but that does not substitute for the rules being correct. Before relying on the rules for that purpose, test with the Firebase emulator and the `@firebase/rules-unit-testing` package:

```bash
firebase emulators:exec --only firestore,storage "your rules test script"
```

(Writing that test suite remains out of scope for this build — the project's Global Constraints rule out a live Firebase project during implementation, so it could not have been executed here either. This is a documented gap: rules-level testing with `@firebase/rules-unit-testing` against a running emulator has not been done.)

### Known backlog / rough edges

Accumulated during implementation, not yet addressed:

- **No transaction/rollback across the multi-step book-add flow.** Adding a book creates the book document, then its section documents, word documents, and the batch that links `wordIds`/`sectionRefs` together, in separate steps; a failure partway through can leave a partially-created book rather than rolling back atomically.
- **Dictionary lookups scale linearly with book length.** Each unique non-common word triggers its own lookup to `api.dictionaryapi.dev`; a very long book could be slow enough to risk a request timeout during the add-book flow.
- **`commonWords.json` is an unfiltered word-frequency list.** It's sourced directly from a frequency list, not curated for a "common words" filter, so it contains a few words some would consider inappropriate to have in that context.

Resolved by the Firebase port (listed here for history, not as outstanding work): the original build's double-click race on a brand-new word's "Add to my vocabulary" button — two concurrent `add: true` requests for the same not-yet-stored word — used to show the loser a 500 ("Could not look up this word."). Firestore's `.create()` (fails atomically with `already-exists` if the document already exists) makes word creation race-safe: the loser's `.create()` call fails, and the route transparently re-fetches and returns the winner's data instead of surfacing an error.
