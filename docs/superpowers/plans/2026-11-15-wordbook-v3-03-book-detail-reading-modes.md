# WordBook v3 Plan 3: Book Detail, Free/Section Reading, Configurable Sectioning, PDF Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Book Detail page around two reading modes (Section reading, unchanged mechanically; new Free reading, ungated), add a one-time sectioning setup for uploaded books (by page count or by auto-detected chapters), and add `.pdf` as a third upload format.

**Architecture:** For uploaded books, `addBook` stops eagerly sectioning — it creates the book doc, runs language + chapter detection, stashes the raw text in Storage, and defers the actual section/vocabulary-extraction work to a new `finalizeSectioning` call triggered by the Book Detail page's first-open setup screen. Free reading is a read-only view over the same `sections` documents Section reading already has, with no gate and no status writes. PDF support is one new parser alongside the existing `.epub` one.

**Tech Stack:** Next.js 15 (App Router) + TypeScript 5, Firebase Admin SDK (Firestore + Storage), `pdfjs-dist` (new dependency), `franc` (new dependency, language detection), Vitest.

**Spec:** `docs/superpowers/specs/2026-11-15-wordbook-v3-design.md`

## Global Constraints

- PDF support covers text-layer PDFs only — a PDF with no extractable text is rejected at upload time, no OCR.
- Free reading has the same tap-to-define / "add to vocabulary" features as Section reading, and never reads or writes any section `status` field.
- Free reading and Section reading must never affect each other's state — this is an explicit anti-goal in the spec.
- "Pages per section" for `.txt`/`.epub` is approximated as a fixed word-count per page (this plan pins the value at 250 words/page); for `.pdf`, "pages" use the PDF's own real page boundaries, no approximation.
- AI-generated books (Plan 4) skip the first-open sectioning setup entirely — this plan's `addBook` changes apply only to the `source: 'uploaded'` path; `finalizeSectioning`'s fixed-word-count strategy is written so Plan 4 can reuse it directly rather than duplicating it.
- Whatever language-detection and chapter-detection libraries this plan picks are pinned here, not left open: `franc` for language detection, `pdfjs-dist` for PDF text + outline extraction.
- Every new Firestore/Storage read or write stays Admin-SDK-only, filtered by uid.

## Review Focus

- A `.pdf` with no embedded text layer (a pure scan) must be rejected at upload with a clear error, not silently produce a book with zero sections and zero words.
- A `.txt` upload with no detectable chapter headings must only offer "by page count" on the first-open setup screen — the "by chapter" option must not appear as a dead end.
- Reading ahead via Free reading must leave every section's `status` field completely untouched — verify by reading a section's status before and after a Free-reading page load.
- A user who abandons the first-open setup screen without confirming a method, then revisits the book, must land back on the same setup screen (not a half-sectioned book, not a crash reading `sections` that don't exist yet).
- The pending raw-text blob in Storage must be deleted once `finalizeSectioning` successfully creates sections from it — a second, accidental call to finalize the same book must not re-run extraction against a blob that's already gone (should fail safely, not throw an unhandled error visible to the user).

---

## File Structure

- Create: `lib/pdf/parsePdf.ts`
- Create: `lib/text/detectLanguage.ts`
- Create: `lib/text/detectChapters.ts`
- Modify: `lib/text/sectionize.ts` — add `splitByPageCount`, `splitByChapters`; keep existing fixed-count logic as `splitByFixedWordCount`
- Create: `lib/storage/pendingBookText.ts`
- Modify: `lib/books/bookService.ts` — defer sectioning for uploads; extract a shared extraction helper
- Modify: `lib/epub/parseEpub.ts` — also return TOC/chapter info
- Modify: `app/api/books/route.ts` — `.pdf` branch, detection calls, stop blocking on sectioning
- Create: `app/api/books/[bookId]/sectioning/route.ts`
- Modify: `app/book/[id]/page.tsx` — first-open setup state vs. normal state
- Create: `app/book/[id]/free/page.tsx`
- Modify: `components/AddBookForm.tsx` — accept `.pdf`

---

### Task 1: PDF parsing

**Files:**
- Create: `lib/pdf/parsePdf.ts`
- Test: `lib/pdf/parsePdf.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export type ParsedPdf = {
    text: string;
    pageTexts: string[]; // text per page, in order — needed by splitByPageCount for exact PDF page boundaries
    outline: string[] | null; // top-level bookmark titles, in order, or null if none
  };
  export async function parsePdf(buffer: Buffer): Promise<ParsedPdf>; // throws if no extractable text
  ```

- [ ] **Step 1: Write failing tests**

```ts
test('extracts text and per-page text from a text-layer PDF fixture', async () => {});
test('extracts outline titles when the PDF has bookmarks', async () => {});
test('returns outline: null when the PDF has no bookmarks', async () => {});
test('throws when the PDF has no extractable text (scanned, no text layer)', async () => {});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- parsePdf`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

Use `pdfjs-dist`'s `getDocument(buffer)` → for each page, `page.getTextContent()` joined into that page's text; concatenate all pages for `text`. Call `pdfDocument.getOutline()` for bookmarks (map to their `.title` fields, `null` if the result is `null`/empty). Throw `new Error('Could not extract text from this PDF — it may be a scanned, image-only document')` when every page's text is empty/whitespace-only, mirroring `parseEpub`'s throw-with-cause pattern for the upload route to catch and turn into a 400.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- parsePdf`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
npm install pdfjs-dist
git add package.json package-lock.json lib/pdf/parsePdf.ts lib/pdf/parsePdf.test.ts
git commit -m "feat: add PDF text extraction"
```

---

### Task 2: Language detection

**Files:**
- Create: `lib/text/detectLanguage.ts`
- Test: `lib/text/detectLanguage.test.ts`

**Interfaces:**
- Produces: `export function detectLanguage(text: string): string` — returns one of `'english' | 'spanish' | 'french' | 'german' | 'russian' | 'unknown'`.

- [ ] **Step 1: Write failing tests**

```ts
test('detects English', () => { expect(detectLanguage('The quick brown fox jumps over the lazy dog.')).toBe('english'); });
test('detects Spanish', () => { expect(detectLanguage('El rápido zorro marrón salta sobre el perro perezoso.')).toBe('spanish'); });
test('returns unknown for text too short/ambiguous to classify confidently', () => { expect(detectLanguage('ok')).toBe('unknown'); });
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- detectLanguage`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

Use `franc`'s `franc(text)` (returns an ISO 639-3 code, or `'und'` for undetermined). Map the handful of in-scope codes to this app's language-name strings via a fixed lookup table: `{ eng: 'english', spa: 'spanish', fra: 'french', deu: 'german', rus: 'russian' }`; anything else (including `'und'`) maps to `'unknown'`. This table is deliberately small — matching the design doc's example language list — and extending it later is a one-line addition, not a redesign.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- detectLanguage`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
npm install franc
git add package.json package-lock.json lib/text/detectLanguage.ts lib/text/detectLanguage.test.ts
git commit -m "feat: add free algorithmic language detection"
```

---

### Task 3: Chapter detection

**Files:**
- Create: `lib/text/detectChapters.ts`
- Test: `lib/text/detectChapters.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function detectChapterBreaksByHeading(text: string): number[] | null;
  // returns word-index positions (0-based, matching sectionize.ts's word-splitting) where
  // each detected chapter starts, or null if fewer than 2 headings were found.
  export function detectChapterBreaksFromTitles(fullText: string, chapterTitles: string[]): number[] | null;
  // for epub/pdf: locates each known chapter title's first occurrence in the flattened text
  // and converts its character offset to a word-index position; null if titles can't be located.
  ```

- [ ] **Step 1: Write failing tests**

```ts
test('finds word-index breaks at "Chapter N" headings', () => {
  const text = 'Intro text here. Chapter 1 First chapter body. Chapter 2 Second chapter body.';
  expect(detectChapterBreaksByHeading(text)).toEqual([/* word indices of "Chapter" in "Chapter 1" and "Chapter 2" */]);
});
test('returns null when fewer than 2 headings are found', () => {
  expect(detectChapterBreaksByHeading('Just one Chapter 1 heading here, nothing else.')).toBeNull();
});
test('locates chapter titles from an epub/pdf outline within the flattened text', () => {});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- detectChapters`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

`detectChapterBreaksByHeading`: regex over the raw text for heading-like patterns (`/\b(Chapter|CHAPTER)\s+\d+\b/g` plus a spelled-out-number variant like `/\b(Chapter|CHAPTER)\s+(One|Two|Three|...)\b/gi` — a fixed, small spelled-number list is fine, not a full numeral parser), convert each match's character index to a word-index by counting whitespace-delimited words before it; require at least 2 matches to be worth offering "by chapter" (a single "chapter" mention is probably not a real structural marker). `detectChapterBreaksFromTitles`: for each title (epub TOC entries or PDF outline titles), `fullText.indexOf(title)`, convert to word-index the same way; drop any title that isn't found; return `null` if fewer than 2 resolved.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- detectChapters`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/text/detectChapters.ts lib/text/detectChapters.test.ts
git commit -m "feat: add chapter-break detection"
```

---

### Task 4: `sectionize.ts` — page-count and chapter-based splitting

**Files:**
- Modify: `lib/text/sectionize.ts`
- Test: `lib/text/sectionize.test.ts` (extend existing file)

**Interfaces:**
- Produces:
  ```ts
  export const WORDS_PER_PAGE = 250; // approximation for .txt/.epub only
  export function splitByFixedWordCount(text: string): Section[]; // the existing splitIntoSections, renamed
  export function splitByPageCount(text: string, pagesPerSection: number, wordsPerPage?: number): Section[];
  export function splitByChapters(text: string, chapterBreaks: number[]): Section[];
  ```
  `Section` type unchanged. `wordsPerPage` defaults to `WORDS_PER_PAGE`; a `.pdf` caller passes real per-page word counts derived from `ParsedPdf.pageTexts` instead (Task 6 wires this).

- [ ] **Step 1: Write failing tests**

```ts
test('splitByPageCount groups N pages worth of words per section using the words-per-page constant', () => {
  const text = Array.from({ length: 1000 }, (_, i) => `w${i}`).join(' ');
  const sections = splitByPageCount(text, 2, 100); // 2 pages/section, 100 words/page -> 200 words/section
  expect(sections[0].endWordIndex - sections[0].startWordIndex).toBe(200);
});
test('splitByChapters makes one section per break, including the trailing section after the last break', () => {
  const text = Array.from({ length: 300 }, (_, i) => `w${i}`).join(' ');
  const sections = splitByChapters(text, [0, 100, 220]);
  expect(sections.map(s => s.startWordIndex)).toEqual([0, 100, 220]);
  expect(sections[2].endWordIndex).toBe(300);
});
test('splitByFixedWordCount preserves the existing SECTION_SIZE=150 behavior', () => {
  // existing test(s) for splitIntoSections, renamed, unchanged assertions
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- sectionize`
Expected: FAIL for the two new functions; the renamed one fails until Step 3's rename lands.

- [ ] **Step 3: Implement**

Rename `splitIntoSections` to `splitByFixedWordCount` (keep `SECTION_SIZE = 150` and its body unchanged) — update its one existing caller inside this file if any, and flag that Plan 4 will import this under its new name. `splitByPageCount(text, pagesPerSection, wordsPerPage = WORDS_PER_PAGE)`: same loop shape as the fixed-count version, with the chunk size computed as `pagesPerSection * wordsPerPage`. `splitByChapters(text, chapterBreaks)`: given sorted, de-duplicated word-index breaks (always starting conceptually at 0 — prepend `0` if the first break isn't already `0`), build one `Section` per consecutive pair of breaks (last section runs to the end of `words`).

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- sectionize`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/text/sectionize.ts lib/text/sectionize.test.ts
git commit -m "feat: add page-count and chapter-based sectioning strategies"
```

---

### Task 5: Pending raw-text storage

**Files:**
- Create: `lib/storage/pendingBookText.ts`
- Test: `lib/storage/pendingBookText.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export async function savePendingBookText(userId: string, bookId: string, text: string): Promise<void>;
  export async function readPendingBookText(userId: string, bookId: string): Promise<string>; // throws if missing
  export async function deletePendingBookText(userId: string, bookId: string): Promise<void>; // no-op if already gone
  ```
  Storage path: `pending-books/{userId}/{bookId}.txt`.

- [ ] **Step 1: Write failing tests**

```ts
test('round-trips text through save then read', async () => {});
test('deletePendingBookText does not throw when the blob is already gone', async () => {});
test('readPendingBookText throws a clear error when nothing was ever saved', async () => {});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- pendingBookText`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Implement**

Thin wrapper over `getStorage(getAdminApp()).bucket().file(\`pending-books/${userId}/${bookId}.txt\`)` — `.save(Buffer.from(text, 'utf-8'))`, `.download()` then `.toString('utf-8')`, `.delete({ ignoreNotFound: true })` (the Admin Storage SDK's own flag for Review Focus item 5 — a second delete call must not throw).

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- pendingBookText`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/storage/pendingBookText.ts lib/storage/pendingBookText.test.ts
git commit -m "feat: add pending raw-text storage for deferred sectioning"
```

---

### Task 6: `bookService` — defer sectioning for uploads; `finalizeSectioning`

**Files:**
- Modify: `lib/books/bookService.ts`
- Test: `lib/books/bookService.test.ts` (extend existing file)

**Interfaces:**
- Consumes: `savePendingBookText`/`readPendingBookText`/`deletePendingBookText` (Task 5), `detectLanguage` (Task 2), `detectChapterBreaksByHeading`/`detectChapterBreaksFromTitles` (Task 3), `splitByPageCount`/`splitByChapters`/`splitByFixedWordCount` (Task 4).
- Produces:
  - `AddBookInput` drops its `language` parameter for the upload path (detection replaces Plan 1's hardcoded value), gains `chapterTitles?: string[]` (from epub/pdf outline, passed by the route), and its `format` union widens from `'text' | 'epub'` to `'text' | 'epub' | 'pdf'` (Task 7 is the first caller to actually pass `'pdf'`, but the type change belongs here alongside `AddBookInput`'s other edits).
  - `export async function finalizeSectioning(params: { bookId: string; userId: string; method: 'by_page' | 'by_chapter'; pagesPerSection?: number }): Promise<void>` — reads the pending text, computes sections via the matching `sectionize.ts` strategy, runs the existing per-section extraction+word-creation loop (refactored out of `addBook` into a shared private helper both call), writes the `sections` docs, sets `books.sectioningMethod`, deletes the pending blob.
  - A new private helper, extracted from today's `addBook` body: `extractAndLinkWords(params: { sections: Section[]; bookId: string; userId: string; language: string; sectionDocRefs: FirebaseFirestore.DocumentReference[] }): Promise<void>` — exactly today's loop (candidate words → select-first → `fetchDefinitionsWithLimit` → `.create()` → batch-link), unchanged in behavior, just no longer inlined in `addBook` so `finalizeSectioning` (and Plan 4's `generateBook`) can call it too.

- [ ] **Step 1: Write failing tests**

```ts
test('addBook for an upload creates the book doc with sectioningMethod: null and no sections yet', async () => {
  const { bookId } = await addBook({ title: 'T', format: 'text', rawText: 'hello world', userId: 'u1' });
  // assert book doc has sectioningMethod: null, language: <detected>, detectedChapterBreaks matching detectChapterBreaksByHeading's result
  // assert sections subcollection is empty
  // assert the pending text blob was saved
});

test('finalizeSectioning with method by_page creates sections and words, then deletes the pending blob', async () => {
  // addBook(...) first, then finalizeSectioning({ bookId, userId, method: 'by_page', pagesPerSection: 1 })
  // assert sections now exist, words were extracted, pending blob read was attempted and then deleted
});

test('finalizeSectioning with method by_chapter uses the stored detectedChapterBreaks', async () => {});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- bookService`
Expected: FAIL — `addBook` still eagerly sections for all formats.

- [ ] **Step 3: Implement**

In `addBook`, for `source: 'uploaded'` (this plan's only path — Plan 4's generated-book path is a separate function, see Plan 4): detect `language` via `detectLanguage(rawText)` (replacing Plan 1's hardcoded `'english'` — this is the call site where that temporary value gets removed); detect chapters via `detectChapterBreaksByHeading(rawText)`, or if `chapterTitles` was passed in, prefer `detectChapterBreaksFromTitles(rawText, chapterTitles)`; create the book doc with `language`, `source: 'uploaded'`, `sectioningMethod: null`, `pagesPerSection: null`, `detectedChapterBreaks` (the array or `null`); call `savePendingBookText(userId, bookId, rawText)`; return `{ bookId }` — no section/word work happens here any more for uploads. Implement `finalizeSectioning`: read the book doc (`language`, `detectedChapterBreaks`); `readPendingBookText`; pick the splitter per `method`; create section docs (same shape as today); call `extractAndLinkWords` with the now-known `language`; update `books.sectioningMethod`/`pagesPerSection`; `deletePendingBookText`.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- bookService`
Expected: PASS, and update any pre-existing `bookService.test.ts` cases that asserted eager sectioning for uploads — those now call `finalizeSectioning` as a second step to reach the same assertions.

- [ ] **Step 5: Commit**

```bash
git add lib/books/bookService.ts lib/books/bookService.test.ts
git commit -m "feat: defer section creation for uploaded books until sectioning is chosen"
```

---

### Task 7: `.pdf` upload + sectioning API route

**Files:**
- Modify: `app/api/books/route.ts`
- Modify: `lib/epub/parseEpub.ts` — also return chapter titles
- Modify: `components/AddBookForm.tsx`
- Create: `app/api/books/[bookId]/sectioning/route.ts`
- Test: `app/api/books/route.test.ts`, `lib/epub/parseEpub.test.ts`, `app/api/books/[bookId]/sectioning/route.test.ts` (extend/create)

**Interfaces:**
- Consumes: `parsePdf` (Task 1), `finalizeSectioning` (Task 6).
- Produces: `ParsedEpub` gains `chapterTitles: string[] | null` (from `epub.flow`'s/`epub.toc`'s titles); `POST /api/books/:bookId/sectioning` with body `{ method: 'by_page' | 'by_chapter'; pagesPerSection?: number }`.

- [ ] **Step 1: Write failing tests**

```ts
test('upload route accepts a .pdf file and routes it to parsePdf', async () => {});
test('upload route rejects a .pdf with no extractable text with a 400 and clear message', async () => {});
test('parseEpub also returns chapter titles from the TOC', async () => {});
test('sectioning route calls finalizeSectioning with the given method and pagesPerSection, scoped to the owning user', async () => {});
test('sectioning route rejects a request from a user who does not own the book (404, matching existing ownership-check style)', async () => {});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- books/route parseEpub sectioning`
Expected: FAIL — no `.pdf` branch; no chapter titles returned; sectioning route doesn't exist.

- [ ] **Step 3: Implement**

In `app/api/books/route.ts`, add a branch parallel to the existing `.epub` one: detect `.pdf` by filename, call `parsePdf(buffer)`, catch its throw into the same 400-with-message pattern `parseEpub`'s catch already uses; pass `parsed.outline` through to `addBook`'s new `chapterTitles` parameter. In `parseEpub.ts`, map `epub.toc` (or `epub.flow`, whichever already exposes chapter titles in this library version) into `chapterTitles`. In `components/AddBookForm.tsx`, extend the file `accept` attribute to `.txt,.epub,.pdf` and the `isEpubFile`-style branch to also recognize `.pdf` (routing it as a `file` upload, not the text-paste path, same as epub today). New route `app/api/books/[bookId]/sectioning/route.ts`: `getAuthedUser()`, verify the book's `userId` matches (404 otherwise, matching the existing ownership-check style in `app/book/[id]/practice/[sectionNumber]/page.tsx`), validate `method`/`pagesPerSection`, call `finalizeSectioning`.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- books/route parseEpub sectioning`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/api/books/route.ts lib/epub/parseEpub.ts components/AddBookForm.tsx app/api/books/[bookId]/sectioning
git commit -m "feat: add PDF upload and the sectioning-setup API route"
```

---

### Task 8: Book Detail page — first-open setup + Free/Section toggle

**Files:**
- Modify: `app/book/[id]/page.tsx`
- Test: `app/book/[id]/page.test.tsx` (new, or extend if one exists)

**Interfaces:**
- Consumes: `/api/books/[bookId]/sectioning` (Task 7).

- [ ] **Step 1: Write failing tests**

```tsx
test('a book with sectioningMethod: null and source: uploaded shows the setup screen', async () => {});
test('the setup screen offers "by chapter" only when detectedChapterBreaks is non-null', async () => {});
test('the setup screen offers a "start Free reading" escape without choosing a method', async () => {});
test('a book with a sectioningMethod already set shows the normal Free/Section toggle + section list', async () => {});
test('a generated book (source: ai_generated) never shows the setup screen even with no prior visit', async () => {});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- 'app/book/\[id\]/page'`
Expected: FAIL — page doesn't branch on `sectioningMethod`/`source` yet.

- [ ] **Step 3: Implement**

Load the book doc including `language`, `source`, `sectioningMethod`, `detectedChapterBreaks`. If `source === 'uploaded' && sectioningMethod === null`: render the setup screen — a page-count number input (posting `{ method: 'by_page', pagesPerSection }`) and, only when `detectedChapterBreaks` is non-null, a "by chapter" button (posting `{ method: 'by_chapter' }`); both `POST /api/books/[id]/sectioning` then `router.refresh()`/`redirect` back to this same page (which now shows the normal view). A plain link to `/book/[id]/free` offers the no-setup escape. Otherwise (method already set, or `source === 'ai_generated'`): render a `Free reading` / `Section reading` toggle (the toggle's "Section reading" side is today's existing section-list markup, kept as-is) with the language badge.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- 'app/book/\[id\]/page'`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/book/[id]/page.tsx
git commit -m "feat: add the book detail first-open sectioning setup and reading-mode toggle"
```

---

### Task 9: Free reading page

**Files:**
- Create: `app/book/[id]/free/page.tsx`
- Test: `app/book/[id]/free/page.test.tsx`

**Interfaces:**
- Consumes: existing `WordPopup` (with `language`, from Plan 1), existing `sections` data — read-only.

- [ ] **Step 1: Write failing tests**

```tsx
test('renders every section\'s text concatenated, regardless of status', async () => {
  // sections with status locked/ready_to_practice/ready_to_read/completed all render their text
});
test('each word is tappable via WordPopup with the book\'s language', async () => {});
test('loading this page never writes to any section\'s status field', async () => {
  // spy on the mocked Firestore update/set methods for the sections collection; assert never called
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- 'app/book/\[id\]/free/page'`
Expected: FAIL — route doesn't exist.

- [ ] **Step 3: Implement**

Load the book (ownership check, same pattern as every other book page) and all its `sections` ordered by `sectionNumber`, read-only (`.get()` only — never `.update()`/`.set()` anywhere on this page, which is what makes the anti-goal in Global Constraints true by construction rather than by a runtime check). Render each section's `text`, tokenized the same way `app/book/[id]/read/[sectionNumber]/page.tsx` already does (`.trim().split(/\s+/)`), wrapping each token in `<WordPopup word={word} language={bookData.language} />`.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- 'app/book/\[id\]/free/page'`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/book/[id]/free
git commit -m "feat: add Free reading"
```

---

### Task 10: Full verification pass

- [ ] **Step 1: Run the full test suite**

Run: `npm test && npm run typecheck`
Expected: PASS

- [ ] **Step 2: Run the production build**

Run: `npm run build`
Expected: PASS — this is the step most likely to surface a `pdfjs-dist`/`franc` bundling issue (both are real dependencies with their own Node/browser-target quirks), per `AGENTS.md`'s warning that `tsc`/`vitest` alone have missed production-only build failures before.

- [ ] **Step 3: Manually exercise one upload of each format**

Upload a `.txt`, an `.epub`, and a `.pdf` through the running dev server; confirm each lands on the first-open setup screen with the right chapter-detection outcome, and that Free reading works immediately without completing setup.

- [ ] **Step 4: Commit (if Steps 1–3 required any fixes)**

```bash
git add -A
git commit -m "fix: address build/runtime issues found in Plan 3 verification"
```

---

## Self-Review Notes

- **Spec coverage:** PDF upload (Tasks 1, 7), language detection replacing Plan 1's placeholder (Task 2, wired in Task 6), chapter detection (Task 3), page/chapter sectioning (Task 4), deferred sectioning + first-open setup (Tasks 5, 6, 8), Free reading (Task 9) — all covered. The translation-based (non-English-capable) definitions pipeline item from the spec is explicitly **not** in this plan — it's Plan 4's responsibility, so uploaded non-English books get definitions via the existing English-only `dictionaryApi.ts` (which already degrades to `null` gracefully, never throwing) until Plan 4 lands; this is a deliberate, sequenced gap, not a missed requirement.
- **Type consistency:** `finalizeSectioning`'s `method` union (`'by_page' | 'by_chapter'`) matches the sectioning API route's validated body and the setup screen's two buttons exactly. `extractAndLinkWords`'s extracted signature is the one Plan 4's `generateBook` will reuse — confirm that plan's task calls it with the same parameter names.
- **Proportion:** 10 tasks for a plan introducing two new dependencies, a new file format, deferred sectioning (a real pipeline restructure), and a whole new reading mode is proportionate to how much this plan changes relative to the others.
