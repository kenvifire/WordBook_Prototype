# WordBook Web Support

## Context

`wb.itluobo.com` is live on `proxy.itluobo.com` (nginx + Let's Encrypt TLS) but currently serves a static placeholder, because `flutter build web --release` fails outright. Investigation found three independent blockers, not one:

1. **Isar has no web backend.** Every model (`Book`, `Word`, `User`, `ReadingSection`, `Statistics`, plus the currently-unused `ReadingProgress` and `UserSubscription`) is annotated `@collection` and has a generated `*.g.dart` part containing 64-bit schema/property IDs that dart2js cannot represent. Because `part` files compile as one unit with their library, merely *importing* a model (which ~20 screens/services/providers do) drags the broken generated code into the web bundle — regardless of whether Isar is ever called.
2. **Local database access bypasses repositories almost everywhere.** `BookRepository`, `WordRepository`, `UserRepository` exist and have clean APIs, but 17 screens/services call `DatabaseService.isar.<collection>...` directly instead of going through them, and `ReadingSection`/`Statistics` have no repository at all — they're queried ad hoc from `section_provider.dart` and `cloud_sync_service.dart`.
3. **Book files live on the local filesystem.** Upload (`books_state_provider.dart`), repository path resolution, and all four reader screens (`pdf_reader.dart`, `epub_reader.dart`, `txt_reader.dart`, `mobi_reader.dart`) use `dart:io` (`File`, `getApplicationDocumentsDirectory`) directly. `file_picker` returns `null` for `path` on web (bytes only), so today's upload flow fails immediately on web with "Could not access file" even before touching the database.

A fourth, smaller gap: `lib/firebase_options.dart`'s `web` `FirebaseOptions` block is still scaffold placeholders (`'YOUR_WEB_API_KEY'` etc.) — nobody ever ran `flutterfire configure` for the web target, so auth/Firestore/Storage won't initialize on web regardless of the above.

## Decisions already made (do not re-litigate)

- **Keep Isar for mobile/desktop.** No swap to a different embedded DB (sembast/drift/Hive) — ruled out explicitly when scoping this work.
- **Web gets an in-memory, session-only data store for v1.** Data does not survive a page reload yet. This is accepted as a known v1 limitation, not a bug. A durable web store (IndexedDB-backed) is Phase 3 follow-up once the shape of the Store interfaces has proven out in production.
- **UI/provider/service code must depend only on plain Dart domain models and repository interfaces, never on Isar types.** Isar annotations live on separate native-only "entity" classes used solely inside the native store implementation, converted to/from the domain model at that boundary. This is the only way to keep today's models importable from web code at all, given `part` files can't be conditionally excluded per platform.
- **Dead collections (`ReadingProgress`, `UserSubscription`) are left untouched.** Grep confirms nothing outside their own model file and `database_service.dart`'s schema list reads or writes them. They stay Isar-only; no web store is needed for them.

## Goals (in order)

1. Replace the `wb.itluobo.com` placeholder with a real `flutter build web --release` output.
2. Core loop works on web: sign in, upload a TXT or EPUB book, read it, extract vocabulary, practice words, see stats — all backed by the in-memory web store.
3. Everything that already works on mobile/desktop keeps working unchanged (no regressions from the model/repository split).

## Non-goals for v1 (explicitly deferred)

- **PDF and MOBI reading on web.** `pdfx` claims web support (confirmed via the wasm dry-run output) but needs its own verification pass; `syncfusion_flutter_pdf`'s web licensing terms need checking; MOBI's conversion-to-EPUB step is itself `dart:io`-bound. Ship TXT/EPUB first; gate PDF/MOBI behind a "not available on web yet" screen rather than letting them crash.
- **In-app purchases on web.** RevenueCat (`purchases_flutter`) web billing is a different integration than mobile IAP and out of scope. Gate Pro-feature purchase buttons behind `kIsWeb` with a "available on mobile" message rather than wiring real web billing.
- **Social sign-in web wiring beyond what already works.** Google/Facebook/Apple sign-in each need extra web-specific setup (OAuth web client ID, Facebook JS SDK tag, Apple Services ID + redirect). Email/password auth is enough for v1; the others get verified/fixed in Phase 2.
- **Durable web persistence.** The in-memory store is accepted for v1 (see Decisions above).

## Phases

**Phase 1 — Foundation (this plan, see companion plan doc):** Firebase web config, the model/entity/store split for all 5 live entities, DatabaseService platform split, in-memory book-bytes store for web, TXT/EPUB readers working from bytes, Pro-purchase UI gated off on web, real `flutter build web` deployed to `wb.itluobo.com`.

**Phase 2 — Parity backlog (separate plan, written after Phase 1 ships):**
- PDF reader on web (verify `pdfx` web rendering end-to-end; decide whether `syncfusion_flutter_pdf` is still needed or redundant)
- MOBI reader on web (likely requires a server-side or WASM conversion step; may simply stay mobile/desktop-only long-term)
- Google/Facebook/Apple sign-in web wiring
- RevenueCat web billing or an alternative web payment path

**Phase 3 — Durability:** swap the in-memory web store for an IndexedDB-backed implementation behind the same Store interfaces, so web data survives reloads.

## Review Focus

- A user who already has mobile/desktop data signs into the web build: do repository call sites that moved off raw Isar calls still return the exact same filtered/sorted results as before (e.g. `BookRepository.getAllBooks` must still sort by `lastReadAt` desc in both the filtered-by-user and unfiltered branches, since the original code sorted in both)?
- A brand-new `Word`/`Book`/`ReadingSection` with `id == 0` (unset) is saved on web: does the in-memory store assign a fresh incrementing id rather than overwriting an existing record that also has `id == 0`?
- A user edits an existing word/book/section (object already has a real `id`) on web: does `put()` overwrite that exact record rather than appending a duplicate?
- Uploading a `.pdf` or `.mobi` file on web: does the app show a clear "not supported on web yet" message instead of the current silent `dart:io` failure?
- Cloud sync runs on web for a user who has only ever used the web in-memory store (no prior local data): does `cloud_sync_service.dart`'s download path populate the in-memory store correctly rather than assuming a populated native DB?
