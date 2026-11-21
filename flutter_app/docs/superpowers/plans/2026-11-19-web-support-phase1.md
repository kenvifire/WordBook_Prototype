# WordBook Web Support — Phase 1 (Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `flutter build web --release` succeed and ship a real web app at `wb.itluobo.com` where a user can sign in, upload a TXT or EPUB book, read it, extract vocabulary, and practice — all without touching Isar or `dart:io` from web-reachable code.

**Architecture:** Every entity (`Book`, `Word`, `User`, `ReadingSection`, `Statistics`) gets a plain Dart domain model (used everywhere — screens, providers, services) plus a native-only Isar `*Entity` class (used only inside that entity's native store). A `<Entity>Store` abstract interface is implemented twice — `NativeXStore` (Isar, behind `*Entity` mapping) and `WebXStore` (in-memory, session-only) — and selected via Dart's conditional-export mechanism, never a runtime `kIsWeb` check, because the problem is what gets *compiled*, not what runs. All screens/services that currently call `DatabaseService.isar.<collection>` directly are migrated to call the relevant `XRepository` instead. The same conditional-export technique removes every other `dart:io` import reachable from the web entry point (file upload/reading, cover images, audio caching, platform detection), gating the not-yet-supported PDF/MOBI readers behind an early "not available on web yet" screen instead of a dead import.

**Tech Stack:** Flutter 3.38 / Dart 3.10, Isar 3.1 (native only), Riverpod, Firebase (auth/Firestore/Storage), `epub_parser`, `file_picker`.

**Spec:** `docs/superpowers/specs/2026-11-19-web-support.md`

## Global Constraints

- Native (iOS/Android/macOS/Windows/Linux) behavior must not change — every native store implementation wraps today's exact Isar calls.
- No `dart:io`, `package:isar/isar.dart`, or any model's generated `*.g.dart` part may be reachable from a web compile. Use conditional exports (`export 'x_native.dart' if (dart.library.html) 'x_web.dart';`), never a runtime `kIsWeb` guard, to solve an import-level problem.
- Web v1 persistence is in-memory and session-only (per spec's Decisions section) — do not build IndexedDB persistence now; that's Phase 3.
- `ReadingProgress` and `UserSubscription` collections are out of scope — nothing outside their model file and `database_service.dart` touches them; leave them exactly as-is.
- PDF and MOBI reading, social sign-in beyond email/password, and RevenueCat web billing are out of scope for this plan (see spec's Non-goals) — those files must still *compile* for web, but their features stay inert behind a clear "not available on web yet" message.

## Review Focus

- `BookRepository.getAllBooks` sorts by `lastReadAt` desc in **both** the `userId`-filtered and unfiltered branches today — a store swap that only sorts one branch is a regression. Covered in Task 2.
- A new record (`id == 0`) saved on web must get a fresh incrementing id, not overwrite another unset-id record already in the in-memory list. Covered in Task 2 (template) and inherited by Tasks 3, 5, 6.
- `WordRepository.getDueWords` matches words whose `nextReviewDate` is null **or** in the past — a store that only checks "less than now" silently stops surfacing brand-new words. Covered in Task 3.
- Uploading a `.pdf` or `.mobi` file on web must show a clear message, not the current silent `dart:io`/`file.path == null` failure. Covered in Task 8/Task 11.
- `cloud_sync_service.dart`'s download path must populate the web in-memory store correctly for a user who has never had local data on this device (fresh browser session) — covered by Task 11's smoke test, since this is an integration behavior no single store's unit tests exercise alone.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `lib/models/book.dart`, `word.dart`, `user.dart`, `reading_section.dart`, `statistics.dart` | MODIFY | Strip Isar annotations/`part`/import; become plain Dart domain models. Enums stay as-is. |
| `lib/data/isar/entities/{book,word,user,reading_section,statistics}_entity.dart` | CREATE | Isar-annotated native-only entities + `toDomain()`/`fromDomain()` mapping. |
| `lib/data/stores/{book,word,user,reading_section,statistics}_store.dart` | CREATE | Abstract `XStore` interface + conditional export of native/web impl. |
| `lib/data/stores/{book,word,user,reading_section,statistics}_store_native.dart` | CREATE | Isar-backed `XStore` impl, using the `*Entity` class. |
| `lib/data/stores/{book,word,user,reading_section,statistics}_store_web.dart` | CREATE | In-memory `XStore` impl. |
| `lib/repositories/book_repository.dart`, `word_repository.dart`, `user_repository.dart` | MODIFY | Swap internals to use the new `XStore` instead of `DatabaseService.isar`; public API unchanged. |
| `lib/repositories/reading_section_repository.dart`, `statistics_repository.dart` | CREATE | New repositories wrapping `ReadingSectionStore`/`StatisticsStore`. |
| `lib/services/database_service.dart` | MODIFY | Becomes a thin `init()`/`close()` facade; native Isar opening moves behind conditional export. |
| `lib/data/file_io/book_file_io.dart` + `_native.dart` + `_web.dart` | CREATE | Cross-platform file bytes store (upload, resolve, cover, audio cache) — see Task 8. |
| `lib/services/book/book_service.dart` | MODIFY | `parseBook` works from bytes, not just a path. |
| 17 screens/services listed in Tasks 2–8 | MODIFY | Replace direct `DatabaseService.isar`/`dart:io` calls with repository/`BookFileIO` calls. |

---

### Task 1: Firebase Web App Registration & Config

**Files:**
- Modify: `lib/firebase_options.dart:46-53` (the `web` `FirebaseOptions` block)

**Interfaces:**
- Produces: a real web `FirebaseOptions` constant other tasks' smoke tests (Task 11) rely on for auth/Firestore/Storage to initialize at all.

- [ ] **Step 1: Register a Web app for the `wordbook-eda86` Firebase project**

In the Firebase Console (or via `flutterfire configure` with the Web platform selected), add a Web app. This is a console/CLI action, not code.

- [ ] **Step 2: Replace the placeholder `web` `FirebaseOptions` values**

Paste the real `apiKey`, `appId`, `messagingSenderId`, `projectId`, `authDomain`, `storageBucket` into `lib/firebase_options.dart:46-53`, replacing the `'YOUR_WEB_...'` placeholders.

- [ ] **Step 3: Verify Firebase initializes on web**

Run: `flutter run -d chrome`
Expected: app launches past the splash/init step without a Firebase init exception in the console.

- [ ] **Step 4: Commit**

```bash
git add lib/firebase_options.dart
git commit -m "feat: add real Firebase web config"
```

---

### Task 2: Book entity/store split (template for Tasks 3, 5, 6)

**Files:**
- Modify: `lib/models/book.dart`
- Create: `lib/data/isar/entities/book_entity.dart`
- Create: `lib/data/stores/book_store.dart`, `book_store_native.dart`, `book_store_web.dart`
- Modify: `lib/repositories/book_repository.dart`
- Modify (direct-Isar call sites → `BookRepository`): `lib/screens/reader/reader_screen.dart:49-64`, `epub_reader.dart:113-146`, `txt_reader.dart:105-139`, `mobi_reader.dart:251-289`, `pdf_reader.dart:134-147`, `lib/screens/statistics/statistics_screen.dart:40-43,239-244`, `lib/screens/home/practice_screen.dart:40`, `lib/screens/vocabulary/vocabulary_screen.dart:61-65`, `lib/services/sync/cloud_sync_service.dart:173,208,224,243`
- Test: `test/data/stores/book_store_web_test.dart`

**Interfaces:**
- Produces (used by Tasks 3, 5, 6 as the pattern to copy, and by `BookRepository`):
```dart
// lib/data/stores/book_store.dart
abstract class BookStore {
  /// Always sorted by lastReadAt desc, matching today's behavior in both branches.
  Future<List<Book>> getAll({String? userId});
  Future<Book?> getById(String bookId);
  /// Insert when book.id == 0 (assigns a fresh id), else overwrite the matching id.
  Future<void> put(Book book);
  Future<void> deleteById(String bookId);
}
/// Each platform file (book_store_native.dart / book_store_web.dart) defines
/// its own concrete class (NativeBookStore / WebBookStore, for direct use by
/// that file's own unit test) AND this same top-level factory function, so
/// production code can call createBookStore() without caring which platform
/// resolved: `BookStore createBookStore() => NativeBookStore();` (native file)
/// or `BookStore createBookStore() => WebBookStore();` (web file).
```
- Produces (public API unchanged from today):
```dart
class BookRepository {
  Future<String> resolveFilePath(Book book); // stubbed in this task, fixed in Task 8
  Future<List<Book>> getAllBooks({String? userId});
  Future<Book?> getBookById(String bookId);
  Future<void> addBook(Book book);
  Future<void> updateBook(Book book);
  Future<void> deleteBook(String bookId);
  Future<void> updateReadingProgress({required String bookId, required int currentPage});
}
```

- [ ] **Step 1: Strip Isar from the domain model**

In `lib/models/book.dart`, remove `import 'package:isar/isar.dart';` and `part 'book.g.dart';`, remove `@collection`, `@Index()`, `@enumerated`, and change `Id id = Isar.autoIncrement;` to `int id = 0;`. Keep every other field, the `BookStatus` enum, and field order unchanged.

- [ ] **Step 2: Create the native-only Isar entity**

`lib/data/isar/entities/book_entity.dart` — a `@collection class BookEntity` with `part 'book_entity.g.dart';`, mirroring every field of `Book` (same `@Index()`/`@enumerated` placement `Book` used to have), plus:
```dart
Book toDomain() => Book()..id = id..bookId = bookId /* ...every field... */;
static BookEntity fromDomain(Book b) => BookEntity()..id = b.id..bookId = b.bookId /* ...every field... */;
```
This file is never imported outside `book_store_native.dart`.

- [ ] **Step 3: Run codegen**

Run: `dart run build_runner build --delete-conflicting-outputs`
Expected: `book_entity.g.dart` generated, no errors; `book.g.dart` not regenerated for `Book` anymore (it's no longer `@collection`).

- [ ] **Step 4: Write the failing web store test**

```dart
// test/data/stores/book_store_web_test.dart
test('put assigns a fresh id for id==0, overwrites for an existing id', () async {
  final store = WebBookStore();
  final a = Book()..bookId = 'a';
  await store.put(a);
  expect(a.id, isNot(0));
  final fetchedId = a.id;
  a.title = 'changed';
  await store.put(a);
  final all = await store.getAll();
  expect(all.where((b) => b.id == fetchedId).length, 1);
  expect(all.first.title, 'changed');
});

test('getAll sorts by lastReadAt desc, with and without a userId filter', () async { /* seed 3 books, 2 users, assert order */ });
```

(No separate automated test for `NativeBookStore`: it's a mechanical wrap of today's exact, already-relied-upon `isar.books...` calls, now operating on `BookEntity` — the `BookEntity <-> Book` mapping is the one new piece of native logic, and it gets exercised by the existing native `flutter test` suite plus Task 11's native regression pass, since every screen that reads/writes a `Book` on native goes through it.)

- [ ] **Step 5: Run test to verify it fails**

Run: `flutter test test/data/stores/book_store_web_test.dart`
Expected: FAIL — `WebBookStore` not defined.

- [ ] **Step 6: Implement `WebBookStore` + `createBookStore()` in `lib/data/stores/book_store_web.dart`**

`WebBookStore implements BookStore`: in-memory `List<Book>`; `put` assigns `_nextId++` when `book.id == 0`, else replaces the list entry with matching `id`. `getAll` always sorts by `lastReadAt` desc (nulls last). Also define `BookStore createBookStore() => WebBookStore();`.

- [ ] **Step 7: Implement `NativeBookStore` + `createBookStore()` in `lib/data/stores/book_store_native.dart`**

`NativeBookStore implements BookStore` delegates to `DatabaseService.isar`, converting `Book <-> BookEntity` at the boundary via `BookEntity.fromDomain`/`.toDomain()`. Internals are today's exact `isar.books.filter()...`/`.where()...`/`.put()`/`.delete()` calls, just operating on `BookEntity`. Also define `BookStore createBookStore() => NativeBookStore();`.

- [ ] **Step 8: Wire the conditional export**

```dart
// lib/data/stores/book_store.dart (same file as the interface — append this line)
export 'book_store_native.dart' if (dart.library.html) 'book_store_web.dart';
```

Production code imports only `book_store.dart` and calls `createBookStore()` — it never names `NativeBookStore`/`WebBookStore` directly, so it compiles against whichever one the conditional export resolved to. Unit tests that target one platform's logic specifically (Step 4) import `book_store_web.dart`/`book_store_native.dart` directly and name `WebBookStore`/`NativeBookStore` explicitly, bypassing the conditional export on purpose.

- [ ] **Step 9: Run tests to verify they pass**

Run: `flutter test test/data/stores/`
Expected: PASS

- [ ] **Step 10: Update `BookRepository` to use `BookStore`**

Replace every `DatabaseService.isar` + `isar.books...` call in `lib/repositories/book_repository.dart` with calls to `final BookStore _store = createBookStore();` (imported from `book_store.dart`). `resolveFilePath` gets a one-line stub: `if (kIsWeb) return book.localPath;` at the top (real fix in Task 8).

- [ ] **Step 11: Migrate the 9 direct-Isar call sites to `BookRepository`**

| File | Old | New |
|---|---|---|
| `reader_screen.dart:49-64` | `isar.books.filter().bookIdEqualTo(...).findFirst()` + `isar.writeTxn(() => isar.books.put(book))` | `BookRepository().getBookById(...)` + `.updateBook(book)` |
| `epub_reader.dart`, `txt_reader.dart`, `mobi_reader.dart`, `pdf_reader.dart` (same shape, 2 call sites each) | same | same |
| `statistics_screen.dart:40-43,239-244` | `isar.books.filter().userIdEqualTo(...).findAll()` (+ sort) | `BookRepository().getAllBooks(userId: ...)` |
| `practice_screen.dart:40` | `isar.books.filter().userIdEqualTo(...).findAll()` | `BookRepository().getAllBooks(userId: ...)` |
| `vocabulary_screen.dart:61-65` | same | same |
| `cloud_sync_service.dart:173,243` | `isar.books.filter().userIdEqualTo(...).findAll()` | `BookRepository().getAllBooks(userId: ...)` |
| `cloud_sync_service.dart:208,224` | `isar.writeTxn(() => isar.books.put(...))` | `BookRepository().updateBook(...)` (208, mutated existing) / `.addBook(...)` (224, new from cloud) |

Remove each file's now-unused `DatabaseService`/`Isar` imports.

- [ ] **Step 12: Run full analyze + native tests**

Run: `flutter analyze && flutter test`
Expected: no errors; existing tests pass.

- [ ] **Step 13: Commit**

```bash
git add lib/models/book.dart lib/data/isar/entities/book_entity.dart lib/data/stores/book_store*.dart lib/repositories/book_repository.dart lib/screens/reader/*.dart lib/screens/statistics/statistics_screen.dart lib/screens/home/practice_screen.dart lib/screens/vocabulary/vocabulary_screen.dart lib/services/sync/cloud_sync_service.dart test/data/stores/book_store_web_test.dart
git commit -m "feat: split Book persistence into native Isar store and web in-memory store"
```

---

### Task 3: Word entity/store split

**Files:** same pattern as Task 2, for `word.dart` / `word_entity.dart` / `word_store*.dart` / `word_repository.dart`.
- Modify (call sites): `lib/providers/section_provider.dart:346-351`, `lib/screens/statistics/statistics_screen.dart:45-48`, `lib/screens/reading/word_list_screen.dart:48-53,131-137,150-157,159-165`, `lib/screens/statistics/book_statistics_screen.dart:38-43`, `lib/screens/reading/section_practice_screen.dart:144-199,303-366`, `lib/screens/home/practice_screen.dart:41`, `lib/screens/vocabulary/word_practice_screen.dart:39-98`, `lib/services/pronunciation_service.dart:42-44`, `lib/services/vocabulary/word_extraction_service.dart:90-93,144-149,298-301,342-347`, `lib/services/vocabulary/vocabulary_service.dart:41-44`, `lib/widgets/common/word_lookup_sheet.dart:75-90,135-177`, `lib/services/sync/cloud_sync_service.dart:248,275,290`

**Interfaces:**
```dart
abstract class WordStore {
  Future<List<Word>> getByBook(String bookId, {bool sortByWord = false});
  Future<List<Word>> getByUser(String userId);
  Future<List<Word>> getByIds(List<String> wordIds);
  Future<Word?> getByBookAndWord(String bookId, String word);
  /// nextReviewDate == null OR nextReviewDate < now — both conditions, matching today's `.group(...).or()`.
  Future<List<Word>> getDue(String bookId, DateTime now);
  Future<Word?> getById(String wordId);
  Future<int> count(String bookId, {WordStatus? status});
  Future<void> put(Word word);
  Future<void> putAll(List<Word> words);
  Future<void> deleteById(String wordId);
  Future<void> deleteByBook(String bookId);
}
```
```dart
class WordRepository {
  Future<List<Word>> getWordsByBook(String bookId, {bool sortByWord = false});
  Future<List<Word>> getWordsByUser(String userId);                      // NEW
  Future<List<Word>> getWordsByIds(List<String> wordIds);                // NEW
  Future<Word?> getWordByBookAndText(String bookId, String word);        // NEW — used by word_lookup_sheet.dart's duplicate check
  Future<List<Word>> getDueWords(String bookId);
  Future<Word?> getWordById(String wordId);
  Future<void> addWord(Word word);
  Future<void> updateWord(Word word);
  Future<void> deleteWord(String wordId);
  Future<void> deleteWordsByBook(String bookId);                        // NEW
  Future<int> getWordCount(String bookId, WordStatus? status);
  Future<void> batchAddWords(List<Word> words);
}
```

- [ ] **Step 1–9: Repeat Task 2's Steps 1–9** for `Word`/`WordEntity`/`WordStore`, with one extra test:
```dart
test('getDue matches null nextReviewDate OR a past one, not just past', () async {
  final store = WebWordStore();
  final neverReviewed = Word()..bookId = 'b'..nextReviewDate = null;
  final overdue = Word()..bookId = 'b'..nextReviewDate = DateTime.now().subtract(const Duration(days: 1));
  final future = Word()..bookId = 'b'..nextReviewDate = DateTime.now().add(const Duration(days: 1));
  await store.putAll([neverReviewed, overdue, future]);
  final due = await store.getDue('b', DateTime.now());
  expect(due.length, 2);
});
```

- [ ] **Step 10: Update `WordRepository`** to use `WordStore`, adding the 4 new methods and the `sortByWord` parameter (default `false`, preserving today's unsorted default for existing callers).

- [ ] **Step 11: Migrate the 12 call sites** using this mapping (file → old Isar call → new repository call):

| File:lines | Old | New |
|---|---|---|
| `section_provider.dart:346-351` | `isar.words.filter().bookIdEqualTo(...).findAll()` | `WordRepository().getWordsByBook(section.bookId)` |
| `statistics_screen.dart:45-48` | `.userIdEqualTo(...).findAll()` | `WordRepository().getWordsByUser(user.uid)` |
| `word_list_screen.dart:48-53` | `.bookIdEqualTo(...).sortByWord().findAll()` | `WordRepository().getWordsByBook(bookId, sortByWord: true)` |
| `word_list_screen.dart:131-137` (`_addWord`) | `isar.words.put(result)` | `WordRepository().addWord(result)` |
| `word_list_screen.dart:150-157` (`_editWord`) | `isar.words.put(result)` | `WordRepository().updateWord(result)` |
| `word_list_screen.dart:159-165` | `.wordIdEqualTo(...).deleteFirst()` | `WordRepository().deleteWord(word.wordId)` |
| `book_statistics_screen.dart:38-43` | `.bookIdEqualTo(...).findAll()` | `WordRepository().getWordsByBook(bookId)` |
| `section_practice_screen.dart:144-148` | `.anyOf(wordIds, ...)` | `WordRepository().getWordsByIds(wordIds)` |
| `section_practice_screen.dart:197-199,364-366` | `put`/`deleteFirst` | `.updateWord`/`.deleteWord` |
| `section_practice_screen.dart:303-304` | `.wordIdEqualTo(...).findFirst()` | `WordRepository().getWordById(...)` |
| `practice_screen.dart:41` | `.userIdEqualTo(...).findAll()` | `WordRepository().getWordsByUser(user.uid)` |
| `word_practice_screen.dart:39-40,96-98` | `.bookIdEqualTo(...).findAll()` / `put` | `.getWordsByBook(...)` / `.updateWord(...)` |
| `pronunciation_service.dart:42-44` | `put` | `.updateWord(word)` |
| `word_extraction_service.dart:90-93` | `.bookIdEqualTo(...).deleteAll()` | `WordRepository().deleteWordsByBook(bookId)` |
| `word_extraction_service.dart:144-149` | `.userIdEqualTo(...).findAll()` | `.getWordsByUser(book.userId)` |
| `word_extraction_service.dart:298-301` | `putAll(batch)` | `.batchAddWords(batch)` |
| `word_extraction_service.dart:342-347` | `.bookIdEqualTo(...).findAll()` | `.getWordsByBook(book.bookId)` |
| `vocabulary_service.dart:41-44` | `put` | `.updateWord(word)` |
| `word_lookup_sheet.dart:75-90,135-140` | `.bookIdEqualTo(...).wordEqualTo(...).findFirst()` | `WordRepository().getWordByBookAndText(bookId, word)` |
| `word_lookup_sheet.dart:175-177` | `put(word)` (new word, wordId pre-set) | `WordRepository().addWord(word)` |
| `cloud_sync_service.dart:248` | `.bookIdEqualTo(...).findAll()` | `.getWordsByBook(bookId)` |
| `cloud_sync_service.dart:275` | `put` (mutated existing) | `.updateWord(localWord)` |
| `cloud_sync_service.dart:290` | `put` (new from cloud) | `.addWord(newWord)` |

- [ ] **Step 12: `flutter analyze && flutter test`** — expect clean.

- [ ] **Step 13: Commit**

---

### Task 4: User entity/store split

**Files:** same pattern as Task 2, for `user.dart` / `user_entity.dart` / `user_store*.dart` / `user_repository.dart`.
- Modify (call sites): `lib/services/sync/cloud_sync_service.dart:133,155`

**Interfaces:**
```dart
abstract class UserStore {
  Future<User?> getById(String userId);
  Future<void> put(User user);
  Future<void> deleteById(String userId);
}
```
`UserRepository`'s public API (`getUserById`, `saveUser`, `updateUserProfile`, `updateUserPreferences`, `deleteUser`) is unchanged — only its internals move to `UserStore`.

- [ ] **Steps 1–9:** Repeat Task 2's Steps 1–9 for `User`/`UserEntity`/`UserStore` (simplest of the five — no sorting, no composite filters).
- [ ] **Step 10:** Update `UserRepository` internals to use `UserStore`.
- [ ] **Step 11:** Migrate `cloud_sync_service.dart:133` (`isar.users.filter().userIdEqualTo(...).findFirst()` → `UserRepository().getUserById(userId)`) and `:155` (`isar.writeTxn(() => isar.users.put(localUser))` → `UserRepository().saveUser(localUser)`).
- [ ] **Step 12:** `flutter analyze && flutter test`.
- [ ] **Step 13:** Commit.

---

### Task 5: ReadingSection entity/store + new repository

**Files:** same pattern as Task 2, for `reading_section.dart` / `reading_section_entity.dart` / `reading_section_store*.dart`.
- Create: `lib/repositories/reading_section_repository.dart`
- Modify (call sites): `lib/providers/section_provider.dart:27-31,63-69,118-121,213-227,253-272,284-296,308-335`, `lib/services/sync/cloud_sync_service.dart:307,331,345`

**Interfaces:**
```dart
abstract class ReadingSectionStore {
  Future<List<ReadingSection>> getByBook(String bookId); // sorted by sectionNumber
  Future<List<ReadingSection>> getByUser(String userId);
  Future<ReadingSection?> getBySectionId(String sectionId);
  Future<ReadingSection?> getByBookAndNumber(String bookId, int sectionNumber);
  Future<void> put(ReadingSection section);
  Future<void> putAll(List<ReadingSection> sections);
  Future<void> deleteByBook(String bookId);
}
```
```dart
class ReadingSectionRepository {
  Future<List<ReadingSection>> getSectionsByBook(String bookId);
  Future<List<ReadingSection>> getSectionsByUser(String userId);
  Future<ReadingSection?> getSectionById(String sectionId);
  Future<ReadingSection?> getSectionByNumber(String bookId, int sectionNumber);
  /// Deletes all existing sections for the book, then inserts the new list (one transaction on native).
  Future<void> replaceSections(String bookId, List<ReadingSection> sections);
  /// Raw put, no timestamp change — for a section that doesn't exist locally yet
  /// (e.g. downloaded from cloud sync), so its own updatedAt isn't stomped with now().
  Future<void> addSection(ReadingSection section);
  /// Bumps updatedAt then puts — for mutating a section that already exists locally.
  Future<void> updateSection(ReadingSection section);
}
```

- [ ] **Steps 1–9:** Repeat Task 2's Steps 1–9 for `ReadingSection`/`ReadingSectionEntity`/`ReadingSectionStore`. Note in the entity file: `SectionType`'s `wordCount` value was appended, not inserted, to preserve existing stored ordinals — keep that ordering in the entity's `@enumerated` field.
- [ ] **Step 10:** Create `ReadingSectionRepository` wrapping `ReadingSectionStore` with the API above.
- [ ] **Step 11:** Migrate `section_provider.dart`'s 7 call sites and `cloud_sync_service.dart`'s 3 call sites to `ReadingSectionRepository`: `section_provider.dart:63-69+118-121` together become one `replaceSections(bookId, sections)` call; `section_provider.dart`'s other mutate-existing-then-put call sites (213-227, 253-272, 284-296, 308-335) use `updateSection`; `cloud_sync_service.dart:307` → `getSectionsByUser`; `:331` (mutated existing local section) → `updateSection`; `:345` (brand-new section from cloud, never seen locally) → `addSection` (not `updateSection` — the cloud's own `updatedAt` must survive, not get overwritten with `now()`).
- [ ] **Step 12:** `flutter analyze && flutter test`.
- [ ] **Step 13:** Commit.

---

### Task 6: Statistics entity/store + new repository

**Files:** same pattern as Task 2, for `statistics.dart` / `statistics_entity.dart` / `statistics_store*.dart`.
- Create: `lib/repositories/statistics_repository.dart`
- Modify (call sites): `lib/services/sync/cloud_sync_service.dart:361,385,399`

**Interfaces:**
```dart
abstract class StatisticsStore {
  Future<List<Statistics>> getByUser(String userId);
  Future<void> put(Statistics stat); // insert-or-overwrite by id, same semantics as other stores
}
class StatisticsRepository {
  Future<List<Statistics>> getStatisticsByUser(String userId);
  /// Raw put, no timestamp change — for a record that doesn't exist locally yet
  /// (e.g. downloaded from cloud sync), so its own updatedAt isn't stomped with now().
  Future<void> addStatistics(Statistics stat);
  /// Bumps updatedAt then puts — for mutating a record that already exists locally.
  Future<void> updateStatistics(Statistics stat);
}
```
Keep `Statistics`'s two computed getters (`readingProgress`, `vocabularyProgress`) on the plain domain model — they're pure field math, not Isar-dependent.

- [ ] **Steps 1–9:** Repeat Task 2's Steps 1–9 for `Statistics`/`StatisticsEntity`/`StatisticsStore`.
- [ ] **Step 10:** Create `StatisticsRepository`.
- [ ] **Step 11:** Migrate `cloud_sync_service.dart:361` (→ `getStatisticsByUser`), `:385` (mutated existing local stat → `updateStatistics`), `:399` (brand-new stat from cloud, never seen locally → `addStatistics`, so its own `updatedAt` isn't overwritten with `now()`).
- [ ] **Step 12:** `flutter analyze && flutter test`.
- [ ] **Step 13:** Commit.

---

### Task 7: DatabaseService platform split

**Files:**
- Modify: `lib/services/database_service.dart`
- Modify: `lib/main.dart:30`

**Interfaces:**
- Produces: `DatabaseService.init()` — replaces the direct `DatabaseService.isar` warm-up call in `main.dart`, safe to call on every platform.
- Consumes: nothing new; `book_store_native.dart`/`word_store_native.dart`/etc. (Tasks 2–6) still reach the real `Isar` instance via `DatabaseService.isar`, which only exists in the native build (conditional-exported).

- [ ] **Step 1: Split `DatabaseService` into native/web via conditional export**, same mechanism as the stores: `database_service.dart` keeps a tiny shared `init()`/`close()` surface; `database_service_native.dart` keeps today's `Isar.open([BookEntitySchema, WordEntitySchema, UserEntitySchema, ReadingSectionEntitySchema, StatisticsEntitySchema, ReadingProgressSchema, UserSubscriptionSchema], ...)` (note: schema list now references the `*Entity` classes from Tasks 2–6, plus the untouched `ReadingProgressSchema`/`UserSubscriptionSchema`); `database_service_web.dart`'s `init()` is a no-op.
- [ ] **Step 2: Update `main.dart:30`** from `await DatabaseService.isar;` to `await DatabaseService.init();`.
- [ ] **Step 3: `flutter analyze && flutter test`** on native; `flutter build web --release` should get past the Isar-literal error now (it will hit the `dart:io` errors from Task 8 next — that's expected at this point).
- [ ] **Step 4: Commit.**

---

### Task 8: Cross-platform file I/O (`BookFileIO`)

**Files:**
- Create: `lib/data/file_io/book_file_io.dart`, `book_file_io_native.dart`, `book_file_io_web.dart`
- Modify: `lib/providers/books_state_provider.dart`, `lib/repositories/book_repository.dart` (finish the `resolveFilePath` stub from Task 2), `lib/services/cover_extraction_service.dart`, `lib/widgets/common/book_card.dart`, `lib/widgets/common/book_list_tile.dart`, `lib/services/pronunciation_service.dart`, `lib/services/cloud_tts_service.dart`, `lib/screens/reader/pdf_reader.dart`, `lib/screens/reader/mobi_reader.dart`, `lib/services/vocabulary/pdf_text_position_service.dart`, `lib/services/vocabulary/word_extraction_service.dart` (discovered during execution: 14 call sites reading book content via raw `File(...)`, never assigned to a task — without this fix, vocabulary extraction stays broken on web even after this task)

**Interfaces:**
```dart
// lib/data/file_io/book_file_io.dart
abstract class BookFileIO {
  /// Stores the picked file's bytes under [bookId] and returns an opaque
  /// reference to pass back into [readBytes]/[resolveFilePath]. On native
  /// this is a real file path; on web it's an in-memory key.
  Future<String> store(String bookId, String fileName, Uint8List bytes);
  Future<Uint8List> readBytes(String reference);
  Future<void> deleteByReference(String reference);
  /// Native: copies the cover bytes to a cache file and returns its path.
  /// Web: keeps the bytes in memory and returns the same opaque reference
  /// scheme as [store], or null if no cover was extracted.
  Future<String?> storeCover(String bookId, Uint8List bytes);
  /// Native: if [storedReference] (a file path) no longer exists on disk,
  /// tries to find the file by name under the current documents directory
  /// and returns that path instead; returns null if storedReference is
  /// still valid or no fallback is found. Web: always returns null — an
  /// in-memory reference never goes stale the way a sandboxed file path
  /// can after a redeploy. Replaces book_repository.dart's own dart:io use.
  Future<String?> resolveStalePath(String storedReference);
  bool get supportsPersistentCache; // false on web — callers skip TTS/audio caching when false
}
export 'book_file_io_native.dart' if (dart.library.html) 'book_file_io_web.dart';
```
Same factory-function convention as Task 2: `book_file_io_web.dart` defines `class WebBookFileIO implements BookFileIO {...}` plus `BookFileIO createBookFileIO() => WebBookFileIO();`; `book_file_io_native.dart` defines `NativeBookFileIO` + the matching `createBookFileIO()`. Production code calls `createBookFileIO()`; the web-specific unit test imports `book_file_io_web.dart` directly and names `WebBookFileIO()` explicitly — otherwise, running that test under `flutter test` (a VM environment, where `dart.library.html` is false) would silently exercise the native implementation instead.

- [ ] **Step 1: Write the failing web test**

```dart
// test/data/file_io/book_file_io_web_test.dart
import 'package:wordbook/data/file_io/book_file_io_web.dart';

test('store then readBytes round-trips the same bytes', () async {
  final io = WebBookFileIO();
  final bytes = Uint8List.fromList([1,2,3]);
  final ref = await io.store('book-1', 'a.txt', bytes);
  expect(await io.readBytes(ref), bytes);
});
```

- [ ] **Step 2: Run test, confirm it fails** (`WebBookFileIO` undefined).

- [ ] **Step 3: Implement `WebBookFileIO` + `createBookFileIO()` in `book_file_io_web.dart`**: a `Map<String, Uint8List>` keyed by a generated reference string; `supportsPersistentCache = false`; `storeCover` keeps bytes the same way.

- [ ] **Step 4: Implement `NativeBookFileIO` + `createBookFileIO()` in `book_file_io_native.dart`**: wraps today's exact `getApplicationDocumentsDirectory()` + `File(...).copy()`/`readAsBytes()`/`writeAsBytes()` logic from `books_state_provider.dart`/`cover_extraction_service.dart`; `supportsPersistentCache = true`.

- [ ] **Step 5: Run test to verify it passes.**

- [ ] **Step 6: Update `books_state_provider.dart`'s `uploadBook()`**: when `file.path == null` (always true on web) but `file.bytes != null` (true on web for `file_picker`), call `createBookFileIO().store(bookId, file.name, file.bytes!)` instead of the `dart:io` copy block; on native keep using `file.path!` as today (file_picker still gives a path natively — `createBookFileIO().store` on native can itself open and copy from that path). Store the returned reference in `Book.localPath` (field reused as "opaque reference", not necessarily a real path anymore).

- [ ] **Step 7: Finish `BookRepository.resolveFilePath`** (stub was added in Task 2): move the method's dart:io-dependent fallback logic (today it directly calls `File(storedPath).exists()` and rebuilds a path under the documents directory) into `NativeBookFileIO.resolveStalePath`, so `book_repository.dart` drops its `dart:io` import entirely:
```dart
Future<String> resolveFilePath(Book book) async {
  final resolved = await createBookFileIO().resolveStalePath(book.localPath);
  if (resolved != null) {
    book.localPath = resolved;
    await updateBook(book);
  }
  return book.localPath;
}
```
`WebBookFileIO.resolveStalePath` always returns `null` (an in-memory reference can't go stale), so this one method works unchanged on both platforms with no `kIsWeb` branch needed in `BookRepository` at all — replacing the Task 2 stub.

- [ ] **Step 8: Update `cover_extraction_service.dart`, `book_card.dart`, `book_list_tile.dart`**: cover extraction calls `createBookFileIO().storeCover(...)`; the two widgets replace `Image.file(File(book.coverUrl!))` with a small `CoverImage` helper (`lib/widgets/common/cover_image.dart`) built around a `FutureBuilder<Uint8List>` over `createBookFileIO().readBytes(reference)`, rendering `Image.memory(bytes)` when loaded and a placeholder icon otherwise — this needs no conditional import of its own since it only calls the already-platform-safe `BookFileIO` interface.

- [ ] **Step 9: Guard audio caching**: in `pronunciation_service.dart` and `cloud_tts_service.dart`, check `createBookFileIO().supportsPersistentCache` before writing a cached clip to disk; when `false` (web), skip the cache write and always re-fetch. Remove the direct `dart:io`/`File` usage from both files.

- [ ] **Step 10: Make `pdf_reader.dart`, `mobi_reader.dart`, `pdf_text_position_service.dart` web-compilable without `dart:io`**: remove the top-level `dart:io` import from each; move any file-reading logic those files had behind `createBookFileIO()` calls too (even though, per the spec's non-goals, the *feature* stays unimplemented on web — see Task 10 for the "not available" message). The point of this step is solely that the **file** must compile for web; it does not need to work there yet.

- [ ] **Step 11: Migrate `word_extraction_service.dart`'s 14 `File(...)` call sites** to `createBookFileIO().readBytes(path)`, decoding with `utf8.decode(bytes)` wherever a `String` was needed (mirroring `_parseTxt`'s approach in Task 9's `book_service.dart` work). This is the file that performs vocabulary extraction, reachable from `word_list_screen.dart`'s "Extract vocabulary" flow and others — without this fix, that feature stays broken on web even though the app compiles.

- [ ] **Step 12: `flutter analyze`** — expect zero `dart:io` imports left outside the native file-IO implementation, `epub_reader.dart`/`txt_reader.dart`/`book_service.dart` (Task 9's job), and `subscription_service.dart` (Task 10's job):

Run: `grep -rl "dart:io" lib --include="*.dart"`
Expected output: `lib/data/file_io/book_file_io_native.dart`, `lib/screens/reader/epub_reader.dart`, `lib/screens/reader/txt_reader.dart`, `lib/services/book/book_service.dart`, `lib/services/subscription_service.dart` — nothing else. (`database_service_native.dart` never had a `dart:io` import to begin with — it only uses `package:isar/isar.dart` and `package:path_provider/path_provider.dart` — and `book_repository.dart`'s own `dart:io` import is gone after Step 7.)

- [ ] **Step 13: Commit.**

---

### Task 9: Bytes-based book parsing + TXT/EPUB web reading

**Files:**
- Modify: `lib/services/book/book_service.dart`
- Modify: `lib/screens/reader/txt_reader.dart`, `lib/screens/reader/epub_reader.dart`
- Modify: `lib/providers/books_state_provider.dart` (discovered during Task 8's execution: `uploadBook()` calls `bookService.parseBook(file.path!)`, which needs a real path that doesn't exist on web — Task 8 added a stopgap "not yet available on web" early-return there; this task replaces it with a real `parseBookBytes(file.bytes!, extension, title)` call on web)

**Interfaces:**
```dart
class BookService {
  // Existing path-based method kept for native callers that still have a real path.
  Future<BookContent> parseBook(String filePath);
  // New: used on web (and usable on native too) via createBookFileIO().readBytes(...).
  Future<BookContent> parseBookBytes(Uint8List bytes, String extension, String fileNameForTitle);
}
```

- [ ] **Step 1: Write the failing test**

```dart
test('parseBookBytes parses a .txt the same way parseBook does for a file with the same content', () async {
  final service = BookService();
  final bytes = Uint8List.fromList(utf8.encode('line one\nline two'));
  final content = await service.parseBookBytes(bytes, '.txt', 'My Book');
  expect(content.pages, ['line one\nline two']);
  expect(content.title, 'My Book');
});
```

- [ ] **Step 2: Run test, confirm it fails.**

- [ ] **Step 3: Implement `parseBookBytes`** in `book_service.dart` by extracting `_parseTxt`'s/`_parseEpub`'s bodies to operate on bytes (`utf8.decode(bytes)` for txt; `epub.EpubReader.readBook(bytes)` already takes bytes), with `parseBook(filePath)` becoming a thin wrapper that reads the file then calls `parseBookBytes`.

- [ ] **Step 4: Run test to verify it passes.**

- [ ] **Step 5: Update `txt_reader.dart`/`epub_reader.dart`** to fetch content via `createBookFileIO().readBytes(book.localPath)` when `kIsWeb`, else keep today's path-based read.

- [ ] **Step 6: Replace Task 8's stopgap in `books_state_provider.dart`'s `uploadBook()`**: where Task 8 added a "not yet available on web" early-return (because `bookService.parseBook(file.path!)` needs a real path), call `bookService.parseBookBytes(file.bytes!, path.extension(file.name).substring(1), path.basenameWithoutExtension(file.name))` on web instead (`file.bytes` is always non-null on web per `file_picker`'s web behavior). Keep the native path-based call unchanged.

- [ ] **Step 7: `flutter analyze && flutter test`.**

- [ ] **Step 8: Commit.**

---

### Task 10: Gate Pro/IAP UI off on web

**Files:**
- Modify: `lib/services/subscription_service.dart`
- Modify: whatever screen renders the Pro purchase button (locate via `grep -rl "purchases_flutter" lib --include="*.dart"` at execution time)

- [ ] **Step 1: Remove `dart:io` from `subscription_service.dart`**: replace the `Platform.isIOS || Platform.isMacOS` check with `defaultTargetPlatform == TargetPlatform.iOS || defaultTargetPlatform == TargetPlatform.macOS` from `package:flutter/foundation.dart`, which is web-safe.
- [ ] **Step 2: Guard the purchase entry point**: wrap the Pro purchase button/flow with `if (kIsWeb) return const Text('Pro features are available on mobile for now.');` (or equivalent) instead of invoking `purchases_flutter` on web.
- [ ] **Step 3: `flutter analyze`.**
- [ ] **Step 4: Commit.**

---

### Task 11: Build and smoke-test

**Files:** none (verification task).

- [ ] **Step 1: Build**

Run: `flutter build web --release`
Expected: succeeds with no errors (warnings about wasm-dry-run incompatibilities for `purchases_flutter`/`flutter_tts` web shims are pre-existing and fine to ignore since this plan doesn't target the `--wasm` build).

- [ ] **Step 2: Serve locally and smoke-test manually**

Run: `cd build/web && python3 -m http.server 8123`, open `http://localhost:8123`.

Checklist:
- Sign in with email/password
- Upload a `.txt` book, open it, turn a page
- Upload a `.epub` book, open it, turn a page
- Extract vocabulary for a book, see the word list
- Run a practice session, answer a few words
- Open the statistics screen
- Attempt to upload a `.pdf` or `.mobi` — see a clear "not available on web yet" message, not a crash
- Open the Pro/subscription screen — see "available on mobile" messaging, no RevenueCat error

- [ ] **Step 3: Fix any remaining issues found during the smoke test** (expect some — this is the first real run).

- [ ] **Step 4: Run full native test suite once more to confirm no regressions**

Run: `flutter test`

- [ ] **Step 5: Commit** any smoke-test fixes.

---

### Task 12: Deploy to `wb.itluobo.com`

**Files:** none (deployment task).

- [ ] **Step 1: Sync the build output**

Run: `rsync -av --delete build/web/ root@proxy.itluobo.com:/var/www/wb/`

- [ ] **Step 2: Verify**

Run: `curl -s -o /dev/null -w "%{http_code}\n" https://wb.itluobo.com/`
Expected: `200`. Open the URL and confirm the real app loads (not the placeholder).

- [ ] **Step 3: Tell the user it's live**, noting the Phase 1 non-goals (PDF/MOBI, social sign-in, IAP, durable persistence) so they know what's intentionally still missing.
