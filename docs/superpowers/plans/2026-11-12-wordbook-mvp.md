# WordBook MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working, demoable Next.js prototype of WordBook: a reader that extracts a book section's vocabulary, has an AI step pick which words matter and define them in context, gates the section behind a spaced-repetition recognition threshold, and lets the learner tap unfamiliar words while reading.

**Architecture:** A single Next.js (App Router) app. Pure, independently-testable domain modules under `lib/` (text extraction, SM-2 SRS, gate math, AI calls, JSON-file persistence) are composed by a thin `lib/services/deckService.ts` and a handful of API route handlers; server-component pages read directly from `lib/`, client components call the API routes for the two real mutations (grading a card, tapping a word).

**Tech Stack:** Next.js 15 (App Router) + React 19 + TypeScript 5, Vitest 2 + @testing-library/react for tests, no ORM/DB (JSON files on disk), direct `fetch` calls to the OpenAI REST API and the MyMemory REST API (no SDKs).

**Spec:** `docs/superpowers/specs/2026-11-12-wordbook-mvp-design.md`

## Global Constraints

- Language pair is fixed for the MVP: Spanish (`es`) → English (`en`).
- Recognition gate threshold defaults to `0.8` (80%). A card counts as "recognized" once it has any review with a grade other than `again`.
- SM-2 quality mapping is fixed: `again` → 0, `hard` → 3, `good` → 4, `easy` → 5. Ease factor floor is `1.3`.
- Flashcard deck size per section is capped at `DECK_SIZE_LIMIT = 12` words.
- Demo book is *Platero y yo* (public domain), bundled at `data/books/platero-y-yo.txt`, split on Roman-numeral chapter headers.
- Demo Day walkthrough: the learner arrives with section index `0` already mastered and unlocked (pre-seeded offstage); the live walkthrough happens on section index `1`.
- AI calls go to OpenAI (`OPENAI_API_KEY` env var, model from `OPENAI_MODEL` env var, default `gpt-4o-mini`). Never hardcode or commit a key.
- The pre-gate candidate word list uses the LLM only (prioritization + context-sense). The tap-while-reading path uses MyMemory only. They never call each other's API.
- Every AI/translation call has a non-throwing fallback so a live API failure during the demo degrades gracefully instead of crashing the page.
- Persistence is local JSON files under `WORDBOOK_DATA_DIR` (default `data/runtime`); no external database. `data/runtime/` and `.env.local` are gitignored.
- No PDF support. Only the bundled plain-text demo book is in scope.
- The three success-metrics (recognition rate, sections/week, SRS retention) are shown as a small static/sample "pilot data" view — never computed live during the demo.

## Review Focus

- A live OpenAI call fails or times out mid-demo → `prioritizeWords` and `getContextSense` must fall back to a deterministic, non-throwing result instead of crashing the study screen (Tasks 9, 10).
- A live MyMemory call fails or is rate-limited during tap-to-add → `translateWord` must echo the original word instead of throwing (Task 11).
- Spanish punctuation/diacritics/dialogue dashes (`¡`, `¿`, `—`, á/é/í/ó/ú/ñ/ü) must not break sentence or word tokenization (Task 1).
- A common word that is only capitalized because it starts a sentence must not be mistaken for a proper noun and wrongly excluded from the candidate list (Task 2).
- A section with zero extractable candidate words, or where every candidate is already known, must auto-pass the gate instead of leaving the learner stuck (Tasks 5, 9).

---

### Task 0: Project Scaffold & Tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.env.local.example`, `.gitignore` (extend existing), `lib/types.ts`, `app/layout.tsx`, `app/page.tsx` (placeholder)

**Interfaces:**
- Produces: shared domain types in `lib/types.ts` that every later task consumes:
```ts
export type Grade = 'again' | 'hard' | 'good' | 'easy';

export interface Section { id: string; bookId: string; index: number; title: string; text: string; }

export interface CandidateWord { token: string; sentence: string; occurrences: number; }

export interface PrioritizedWord extends CandidateWord { reason: string; priorityScore: number; }

export interface WordSense { token: string; sentence: string; definitionEn: string; translationEn: string; exampleEs: string; }

export interface SM2State { easeFactor: number; interval: number; repetitions: number; }

export interface CardState extends SM2State { id: string; sectionId: string; token: string; lastGrade: Grade | null; dueAt: string; }

export interface GateStatus { recognizedCount: number; totalCount: number; recognitionRate: number; passed: boolean; }

export interface ReviewLogEntry { cardId: string; grade: Grade; gradedAt: string; }
```

- [ ] **Step 1: Create `package.json`** with `name: "wordbook"`, `"type": "module"`, scripts `dev: "next dev"`, `build: "next build"`, `start: "next start"`, `test: "vitest run"`, `typecheck: "tsc --noEmit"`, `seed:demo: "tsx scripts/seedDemo.ts"`, and dependencies: `next@^15`, `react@^19`, `react-dom@^19`; devDependencies: `typescript@^5`, `@types/node`, `@types/react`, `@types/react-dom`, `vitest@^2`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `tsx`.
- [ ] **Step 2: Create `tsconfig.json`** — Next.js's standard strict TS config, with a `@/*` path alias mapped to the repo root.
- [ ] **Step 3: Create `next.config.ts`** with a minimal default export (`{}` wrapped in `defineConfig`/`NextConfig` typing).
- [ ] **Step 4: Create `vitest.config.ts`** — `environment: 'jsdom'`, `include: ['**/*.test.ts', '**/*.test.tsx']`, `exclude` node_modules/.next, and the same `@/*` alias as `tsconfig.json`.
- [ ] **Step 5: Create `lib/types.ts`** with the exact types shown above.
- [ ] **Step 6: Create `app/layout.tsx` and `app/page.tsx`** — minimal valid Next.js App Router layout and a placeholder page rendering an `<h1>WordBook</h1>` so `next dev` boots cleanly.
- [ ] **Step 7: Create `.env.local.example`** listing `OPENAI_API_KEY=`, `OPENAI_MODEL=gpt-4o-mini`, `MYMEMORY_EMAIL=`, `WORDBOOK_DATA_DIR=data/runtime`, each with a one-line comment. Extend `.gitignore` with `.env.local`, `data/runtime/`, `node_modules`, `.next`.
- [ ] **Step 8: Run `npm install`.**
- [ ] **Step 9: Verify.** Run `npm run typecheck` (expect no errors) and `npm run dev`, confirm the server boots and `app/page.tsx` renders at `http://localhost:3000`, then stop the dev server.
- [ ] **Step 10: Commit.**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts vitest.config.ts .env.local.example .gitignore lib/types.ts app/layout.tsx app/page.tsx
git commit -m "chore: scaffold Next.js app, tooling, and shared domain types"
```

---

### Task 1: Spanish Tokenizer & Sentence Splitter

**Files:**
- Create: `lib/text/tokenize.ts`
- Test: `lib/text/tokenize.test.ts`

**Interfaces:**
- Consumes: nothing beyond stdlib.
- Produces:
```ts
export function splitSentences(text: string): string[];
export function tokenizeWords(sentence: string): string[]; // preserves original casing, strips surrounding punctuation
export function normalizeToken(token: string): string; // lowercase form used as the dictionary key
```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, test, expect } from 'vitest';
import { splitSentences, tokenizeWords, normalizeToken } from './tokenize';

test('splitSentences handles Spanish punctuation and dialogue dashes', () => {
  const text = '¡Platero es pequeño! —dijo el niño. ¿Verdad que sí?';
  expect(splitSentences(text)).toEqual([
    '¡Platero es pequeño!',
    '—dijo el niño.',
    '¿Verdad que sí?',
  ]);
});

test('tokenizeWords strips punctuation but keeps accents and drops a leading dash', () => {
  expect(tokenizeWords('¡Platero es pequeño, peludo y algodonoso!')).toEqual([
    'Platero', 'es', 'pequeño', 'peludo', 'y', 'algodonoso',
  ]);
  expect(tokenizeWords('—dijo años.')).toEqual(['dijo', 'años']);
});

test('normalizeToken lowercases while preserving accented letters', () => {
  expect(normalizeToken('Platero')).toBe('platero');
  expect(normalizeToken('AÑOS')).toBe('años');
});
```

- [ ] **Step 2: Run `npm test -- lib/text/tokenize.test.ts`, confirm it fails** (module doesn't exist yet).
- [ ] **Step 3: Implement `tokenize.ts`.** Use a Unicode-aware word regex (e.g. `/[\p{L}][\p{L}'-]*/gu`) for `tokenizeWords`. For `splitSentences`, split on sentence-ending punctuation (`.`, `!`, `?`) followed by whitespace, and additionally treat a line/clause starting with `—` as its own sentence (dialogue dash); trim each resulting piece.
- [ ] **Step 4: Run the test again, confirm it passes.**
- [ ] **Step 5: Commit.**

```bash
git add lib/text/tokenize.ts lib/text/tokenize.test.ts
git commit -m "feat: add Spanish-aware sentence and word tokenizer"
```

---

### Task 2: Stopwords & Candidate Word Extraction

**Files:**
- Create: `lib/text/stopwords.es.ts`, `lib/text/filter.ts`
- Test: `lib/text/filter.test.ts`

**Interfaces:**
- Consumes: `splitSentences`, `tokenizeWords`, `normalizeToken` (Task 1); `CandidateWord` (Task 0).
- Produces:
```ts
export const SPANISH_STOPWORDS: Set<string>;
export function extractCandidates(text: string, opts?: { stopwords?: Set<string> }): CandidateWord[];
```

**Extraction rule (exact, since it's load-bearing and not derivable from the signature alone; corrected during implementation — see Task 2's ledger ruling in the plan's execution record):** for each unique normalized token, scan every occurrence across the text. If the token is capitalized in the source in *every* occurrence (i.e. it never appears in lowercase form anywhere in the text), treat it as a proper noun and exclude it entirely, regardless of sentence position. Also exclude tokens in the stopword set (regardless of case/position), tokens shorter than 2 characters, and tokens that are purely digits. For each surviving token, record `occurrences` (count across the whole text) and `sentence` (the first sentence it appears in, verbatim).

*(Accepted trade-off: a genuine content word that happens to occur only once in a short section, at the start of a sentence, would be wrongly excluded as a false-positive "proper noun." This is acceptable for the MVP — sections are short chapters and only the top `DECK_SIZE_LIMIT` words get taught anyway — and is simpler and more testable than tracking sentence-initial position.)*

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, test, expect } from 'vitest';
import { extractCandidates, SPANISH_STOPWORDS } from './filter';

test('SPANISH_STOPWORDS contains common function words', () => {
  for (const w of ['el', 'la', 'los', 'las', 'de', 'que', 'y', 'en', 'un', 'una', 'es', 'por', 'con', 'su', 'se', 'no', 'lo', 'le', 'del']) {
    expect(SPANISH_STOPWORDS.has(w)).toBe(true);
  }
});

test('extractCandidates filters stopwords and proper nouns, keeps common words, counts occurrences', () => {
  const text = 'Platero es pequeño. El burro llamado Platero camina. Marcos vio a Platero.';
  const byToken = Object.fromEntries(extractCandidates(text).map(c => [c.token, c]));
  expect(byToken['platero']).toBeUndefined(); // capitalized mid-sentence elsewhere -> proper noun
  expect(byToken['marcos']).toBeUndefined(); // proper noun
  expect(byToken['el']).toBeUndefined(); // stopword even though sentence-initial
  expect(byToken['pequeño']).toEqual({ token: 'pequeño', sentence: 'Platero es pequeño.', occurrences: 1 });
  expect(byToken['burro']).toEqual({ token: 'burro', sentence: 'El burro llamado Platero camina.', occurrences: 1 });
});

test('extractCandidates returns an empty array for text with nothing left after filtering', () => {
  expect(extractCandidates('El la de que y en un.')).toEqual([]);
});
```

- [ ] **Step 2: Run, confirm failure.**
- [ ] **Step 3: Implement `stopwords.es.ts`** with a standard ~100-word Spanish stopword list (articles, prepositions, conjunctions, common pronouns and auxiliary verb forms) covering at minimum the words asserted in the test above. Implement `extractCandidates` per the rule stated above, using `splitSentences`/`tokenizeWords`/`normalizeToken` from Task 1.
- [ ] **Step 4: Run, confirm pass.**
- [ ] **Step 5: Commit.**

```bash
git add lib/text/stopwords.es.ts lib/text/filter.ts lib/text/filter.test.ts
git commit -m "feat: extract filtered candidate vocabulary from Spanish text"
```

---

### Task 3: Demo Book & Section Splitting

**Files:**
- Create: `data/books/platero-y-yo.txt`, `lib/text/sections.ts`
- Test: `lib/text/sections.test.ts`

**Interfaces:**
- Consumes: `Section` type (Task 0).
- Produces:
```ts
export const DEMO_BOOK_ID = 'platero-y-yo';
export function splitIntoSections(fullText: string, bookId: string): Section[];
export function loadBook(bookId: string): { id: string; title: string; sections: Section[] };
export function getSection(sectionId: string): Section | undefined;
```

- [ ] **Step 1: Fetch the demo book text.** Use WebFetch (or curl) to get the public-domain Spanish text of *Platero y yo* (Juan Ramón Jiménez) from a public-domain source (e.g. Project Gutenberg or Wikisource). Trim it to at least the first 8 short chapters (enough for: 1 pre-seeded "mastered" section, 1 live-demo section, and a couple more to show the reading/tap-to-add flow). Save it to `data/books/platero-y-yo.txt`, preserving each chapter's Roman-numeral heading (`I`, `II`, `III`, ...) on its own line.
- [ ] **Step 2: Write the failing tests**

```ts
import { describe, test, expect } from 'vitest';
import { splitIntoSections, loadBook, getSection, DEMO_BOOK_ID } from './sections';

test('splitIntoSections splits on standalone Roman-numeral headers', () => {
  const sample = 'I\n\nPlatero es pequeño, peludo, suave.\n\nII\n\nLo dejo suelto y se va al prado.\n';
  const sections = splitIntoSections(sample, 'platero-y-yo');
  expect(sections).toHaveLength(2);
  expect(sections[0]).toMatchObject({ bookId: 'platero-y-yo', index: 0, title: 'I' });
  expect(sections[0].text).toContain('Platero es pequeño');
  expect(sections[1].title).toBe('II');
});

test('splitIntoSections falls back to chunking when no headers are found', () => {
  const sections = splitIntoSections('Una sola seccion sin encabezados de capitulo.', 'x');
  expect(sections.length).toBeGreaterThanOrEqual(1);
});

test('loadBook reads the bundled demo book and getSection finds a section by id', () => {
  const book = loadBook(DEMO_BOOK_ID);
  expect(book.sections.length).toBeGreaterThanOrEqual(6);
  const found = getSection(book.sections[1].id);
  expect(found).toEqual(book.sections[1]);
});
```

- [ ] **Step 3: Run, confirm failure.**
- [ ] **Step 4: Implement `sections.ts`.** `splitIntoSections`: scan lines; a trimmed line matching `/^[IVXLCDM]+$/` starts a new section whose `title` is that line and whose `text` is everything up to the next header (or end of text); `id` = `` `${bookId}-${index}` ``. If no header lines are found, fall back to splitting the text into fixed-size chunks (~800 words each) as single-section-per-chunk. `loadBook`: read `data/books/<bookId>.txt` via `fs.readFileSync`, call `splitIntoSections`, pair with a hardcoded `BOOK_TITLES` map (`{ 'platero-y-yo': 'Platero y yo (Juan Ramón Jiménez)' }`). `getSection`: call `loadBook(DEMO_BOOK_ID)` and `.find` by id.
- [ ] **Step 5: Run, confirm pass.** Also sanity-check `loadBook(DEMO_BOOK_ID).sections.length` matches the number of chapters actually fetched in Step 1.
- [ ] **Step 6: Commit** (including the bundled public-domain text file).

```bash
git add data/books/platero-y-yo.txt lib/text/sections.ts lib/text/sections.test.ts
git commit -m "feat: bundle demo book and split it into chapters"
```

---

### Task 4: SM-2 Spaced Repetition Core

**Files:**
- Create: `lib/srs/sm2.ts`
- Test: `lib/srs/sm2.test.ts`

**Interfaces:**
- Consumes: `Grade`, `SM2State` (Task 0).
- Produces:
```ts
export const INITIAL_SM2_STATE: SM2State; // { easeFactor: 2.5, interval: 0, repetitions: 0 }
export function gradeToQuality(grade: Grade): number; // again:0, hard:3, good:4, easy:5
export function nextSM2State(state: SM2State, grade: Grade): SM2State;
```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, test, expect } from 'vitest';
import { INITIAL_SM2_STATE, nextSM2State } from './sm2';

test('good from the initial state: repetitions=1, interval=1, ease factor unchanged', () => {
  expect(nextSM2State(INITIAL_SM2_STATE, 'good')).toEqual({ easeFactor: 2.5, interval: 1, repetitions: 1 });
});

test('three consecutive good grades grow the interval 1 -> 6 -> 15, ease factor stays 2.5', () => {
  let state = INITIAL_SM2_STATE;
  state = nextSM2State(state, 'good');
  state = nextSM2State(state, 'good');
  state = nextSM2State(state, 'good');
  expect(state).toEqual({ easeFactor: 2.5, interval: 15, repetitions: 3 });
});

test('again resets repetitions and interval to 1 and lowers the ease factor', () => {
  const state = { easeFactor: 2.5, interval: 6, repetitions: 2 };
  expect(nextSM2State(state, 'again')).toEqual({ easeFactor: 1.7, interval: 1, repetitions: 0 });
});

test('easy raises the ease factor by 0.1 from the initial state', () => {
  expect(nextSM2State(INITIAL_SM2_STATE, 'easy')).toEqual({ easeFactor: 2.6, interval: 1, repetitions: 1 });
});

test('ease factor never drops below 1.3', () => {
  const state = { easeFactor: 1.35, interval: 1, repetitions: 0 };
  expect(nextSM2State(state, 'again').easeFactor).toBe(1.3);
});
```

- [ ] **Step 2: Run, confirm failure.**
- [ ] **Step 3: Implement `sm2.ts`** with the standard SM-2 update, rounding `easeFactor` to 2 decimal places to avoid float drift:

```ts
export function nextSM2State(state: SM2State, grade: Grade): SM2State {
  const q = gradeToQuality(grade);
  let easeFactor = state.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  easeFactor = Math.round(Math.max(1.3, easeFactor) * 100) / 100;
  let { interval, repetitions } = state;
  if (q < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;
    interval = repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.round(interval * easeFactor);
  }
  return { easeFactor, interval, repetitions };
}
```

- [ ] **Step 4: Run, confirm pass.**
- [ ] **Step 5: Commit.**

```bash
git add lib/srs/sm2.ts lib/srs/sm2.test.ts
git commit -m "feat: implement SM-2 spaced repetition scheduler"
```

---

### Task 5: Recognition Gate Calculation

**Files:**
- Create: `lib/srs/gate.ts`
- Test: `lib/srs/gate.test.ts`

**Interfaces:**
- Consumes: `CardState`, `Grade`, `GateStatus` (Task 0).
- Produces:
```ts
export const RECOGNITION_THRESHOLD = 0.8;
export function isRecognized(card: CardState): boolean; // lastGrade !== null && lastGrade !== 'again'
export function computeGateStatus(cards: CardState[], threshold?: number): GateStatus;
```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, test, expect } from 'vitest';
import { computeGateStatus } from './gate';
import type { CardState } from '@/lib/types';

const card = (lastGrade: CardState['lastGrade']): CardState => ({
  id: 'x', sectionId: 'sec', token: 't', easeFactor: 2.5, interval: 1, repetitions: 1, lastGrade, dueAt: '2026-01-01T00:00:00.000Z',
});

test('an empty section auto-passes the gate', () => {
  expect(computeGateStatus([])).toEqual({ recognizedCount: 0, totalCount: 0, recognitionRate: 1, passed: true });
});

test('passes exactly at the 80% default threshold', () => {
  const cards = [card('good'), card('good'), card('good'), card('good'), card('again')];
  expect(computeGateStatus(cards)).toEqual({ recognizedCount: 4, totalCount: 5, recognitionRate: 0.8, passed: true });
});

test('fails below the threshold', () => {
  const cards = [card('good'), card('again'), card('again'), card('again'), card('again')];
  expect(computeGateStatus(cards).passed).toBe(false);
});

test('a never-reviewed card (lastGrade null) does not count as recognized', () => {
  expect(computeGateStatus([card(null)]).recognizedCount).toBe(0);
});
```

- [ ] **Step 2: Run, confirm failure.**
- [ ] **Step 3: Implement `gate.ts`** per the exact rule in the test above (`totalCount === 0` ⇒ `recognitionRate: 1, passed: true`).
- [ ] **Step 4: Run, confirm pass.**
- [ ] **Step 5: Commit.**

```bash
git add lib/srs/gate.ts lib/srs/gate.test.ts
git commit -m "feat: compute section recognition-gate status"
```

---

### Task 6: JSON Store Foundation & Card/Review Persistence

**Files:**
- Create: `lib/store/jsonStore.ts`, `lib/store/cardStore.ts`, `lib/store/reviewStore.ts`
- Test: `lib/store/jsonStore.test.ts`, `lib/store/cardStore.test.ts`, `lib/store/reviewStore.test.ts`

**Interfaces:**
- Consumes: `CardState`, `ReviewLogEntry`, `SM2State` (Task 0); `INITIAL_SM2_STATE` (Task 4).
- Produces:
```ts
// jsonStore.ts
export function dataPath(...segments: string[]): string; // joins process.env.WORDBOOK_DATA_DIR (default 'data/runtime') with segments
export function readJson<T>(filePath: string, fallback: T): T;
export function writeJson<T>(filePath: string, data: T): void;

// cardStore.ts
export function getCard(sectionId: string, token: string): CardState | undefined;
export function getCardsForSection(sectionId: string): CardState[];
export function upsertCard(card: CardState): void;
export function createCardIfMissing(sectionId: string, token: string): CardState;

// reviewStore.ts
export function appendReview(entry: ReviewLogEntry): void;
export function getReviewsForCard(cardId: string): ReviewLogEntry[];
```

- [ ] **Step 1: Write the failing tests** (each test file sets `process.env.WORDBOOK_DATA_DIR` to a fresh `fs.mkdtempSync` directory in `beforeEach` and restores it in `afterEach`)

```ts
// jsonStore.test.ts
test('readJson returns the fallback when the file is missing', () => {
  expect(readJson(path.join(tmp, 'x.json'), { a: 1 })).toEqual({ a: 1 });
});
test('writeJson then readJson round-trips and creates missing directories', () => {
  const file = path.join(tmp, 'nested', 'dir', 'x.json');
  writeJson(file, { a: 2 });
  expect(readJson(file, {})).toEqual({ a: 2 });
});
```

```ts
// cardStore.test.ts
test('createCardIfMissing creates an initial-state card and persists it', () => {
  const card = createCardIfMissing('sec-1', 'burro');
  expect(card).toMatchObject({ id: 'sec-1:burro', sectionId: 'sec-1', token: 'burro', easeFactor: 2.5, interval: 0, repetitions: 0, lastGrade: null });
  expect(getCard('sec-1', 'burro')).toEqual(card);
});
test('createCardIfMissing is idempotent and getCardsForSection filters by section', () => {
  const first = createCardIfMissing('sec-1', 'burro');
  upsertCard({ ...first, repetitions: 3 });
  expect(createCardIfMissing('sec-1', 'burro').repetitions).toBe(3);
  createCardIfMissing('sec-2', 'luna');
  expect(getCardsForSection('sec-1').map(c => c.token)).toEqual(['burro']);
});
```

```ts
// reviewStore.test.ts
test('appendReview and getReviewsForCard round-trip in order', () => {
  appendReview({ cardId: 'sec-1:burro', grade: 'good', gradedAt: '2026-01-01T00:00:00.000Z' });
  appendReview({ cardId: 'sec-1:burro', grade: 'easy', gradedAt: '2026-01-02T00:00:00.000Z' });
  expect(getReviewsForCard('sec-1:burro').map(r => r.grade)).toEqual(['good', 'easy']);
});
```

- [ ] **Step 2: Run, confirm failure.**
- [ ] **Step 3: Implement.** `jsonStore.ts` uses synchronous `fs` calls, creating parent directories with `fs.mkdirSync(dir, { recursive: true })` before writing. `cardStore.ts` persists a `Record<string, CardState>` at `dataPath('cards.json')`, keyed by `` `${sectionId}:${token}` ``; `createCardIfMissing` builds a fresh card from `INITIAL_SM2_STATE` with `lastGrade: null` and `dueAt: new Date().toISOString()` when absent. `reviewStore.ts` persists a `ReviewLogEntry[]` at `dataPath('reviews.json')`, appending and filtering by `cardId`.
- [ ] **Step 4: Run, confirm pass.**
- [ ] **Step 5: Commit.**

```bash
git add lib/store/jsonStore.ts lib/store/cardStore.ts lib/store/reviewStore.ts lib/store/*.test.ts
git commit -m "feat: add JSON-file persistence for SRS cards and review log"
```

---

### Task 7: Learner Profile Persistence

**Files:**
- Create: `lib/store/learnerStore.ts`
- Test: `lib/store/learnerStore.test.ts`

**Interfaces:**
- Consumes: `readJson`/`writeJson`/`dataPath` (Task 6).
- Produces:
```ts
export function getKnownWords(): string[]; // normalized tokens
export function markWordsKnown(tokens: string[]): void; // union, deduped
export function isSectionUnlocked(sectionId: string): boolean;
export function unlockSection(sectionId: string): void;
```

- [ ] **Step 1: Write the failing tests**

```ts
test('known words start empty and accumulate as a deduped union', () => {
  expect(getKnownWords()).toEqual([]);
  markWordsKnown(['burro', 'luna']);
  markWordsKnown(['luna', 'cielo']);
  expect(getKnownWords().sort()).toEqual(['burro', 'cielo', 'luna']);
});

test('sections start locked until explicitly unlocked', () => {
  expect(isSectionUnlocked('sec-2')).toBe(false);
  unlockSection('sec-2');
  expect(isSectionUnlocked('sec-2')).toBe(true);
});
```

- [ ] **Step 2: Run, confirm failure.**
- [ ] **Step 3: Implement.** Persist `{ knownWords: string[]; unlockedSections: string[] }` at `dataPath('learner.json')`, defaulting to `{ knownWords: [], unlockedSections: [] }`.
- [ ] **Step 4: Run, confirm pass.**
- [ ] **Step 5: Commit.**

```bash
git add lib/store/learnerStore.ts lib/store/learnerStore.test.ts
git commit -m "feat: add learner known-words and section-unlock persistence"
```

---

### Task 8: AI Client & Response Cache

**Files:**
- Create: `lib/ai/client.ts`, `lib/ai/cache.ts`
- Test: `lib/ai/client.test.ts`, `lib/ai/cache.test.ts`

**Interfaces:**
- Consumes: `dataPath` (Task 6, for the cache's default directory).
- Produces:
```ts
export class AIClientError extends Error {}
export interface AIClient { complete(prompt: string): Promise<string>; }
export function createOpenAIClient(apiKey: string, model?: string): AIClient;

export async function withCache<T>(key: string, compute: () => Promise<T>, opts?: { cacheDir?: string }): Promise<T>;
```

- [ ] **Step 1: Write the failing tests**

```ts
// client.test.ts
test('complete posts to the chat completions endpoint and returns the message content', async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ choices: [{ message: { content: 'hello' } }] }) });
  const client = createOpenAIClient('key', 'gpt-4o-mini');
  await expect(client.complete('prompt')).resolves.toBe('hello');
  expect(fetch).toHaveBeenCalledWith(
    'https://api.openai.com/v1/chat/completions',
    expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer key' }) }),
  );
});

test('complete throws AIClientError on a non-ok response', async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => 'rate limited' });
  await expect(createOpenAIClient('key').complete('prompt')).rejects.toThrow(AIClientError);
});
```

```ts
// cache.test.ts
test('withCache computes once and serves the cached value on the second call', async () => {
  const compute = vi.fn().mockResolvedValue({ value: 42 });
  const first = await withCache('k1', compute, { cacheDir: tmp });
  const second = await withCache('k1', compute, { cacheDir: tmp });
  expect(first).toEqual({ value: 42 });
  expect(second).toEqual({ value: 42 });
  expect(compute).toHaveBeenCalledTimes(1);
});

test('a rejected compute is not cached', async () => {
  const compute = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ value: 1 });
  await expect(withCache('k2', compute, { cacheDir: tmp })).rejects.toThrow('boom');
  await expect(withCache('k2', compute, { cacheDir: tmp })).resolves.toEqual({ value: 1 });
});
```

- [ ] **Step 2: Run, confirm failure.**
- [ ] **Step 3: Implement.** `client.ts`: `complete` POSTs `{ model, messages: [{ role: 'user', content: prompt }] }` with an `Authorization: Bearer <apiKey>` header; on `!ok`, throw `new AIClientError(`OpenAI request failed: ${status} ${await text()}`)`; otherwise return `(await json()).choices[0].message.content`. `cache.ts`: hash `key` with `node:crypto` (e.g. `createHash('sha1')`) to a filename under `opts.cacheDir ?? dataPath('ai-cache')`; read-and-return via `readJson` if present (Task 6); otherwise `await compute()`, `writeJson` the result, return it — propagate rejections without caching them.
- [ ] **Step 4: Run, confirm pass.**
- [ ] **Step 5: Commit.**

```bash
git add lib/ai/client.ts lib/ai/cache.ts lib/ai/client.test.ts lib/ai/cache.test.ts
git commit -m "feat: add OpenAI client wrapper and a file-backed response cache"
```

---

### Task 9: AI Word Prioritization

**Files:**
- Create: `lib/ai/prioritize.ts`
- Test: `lib/ai/prioritize.test.ts`

**Interfaces:**
- Consumes: `AIClient` (Task 8); `CandidateWord`, `PrioritizedWord` (Task 0).
- Produces:
```ts
export const DECK_SIZE_LIMIT = 12;
export async function prioritizeWords(client: AIClient, candidates: CandidateWord[], knownWords: string[], opts?: { limit?: number }): Promise<PrioritizedWord[]>;
```

**Behavior:** builds a prompt asking the model to drop any candidate already in `knownWords`, rank the rest by how worth-teaching they are (frequency, difficulty, narrative importance), and return JSON `{ token, reason, priorityScore }[]` sorted descending by `priorityScore`, capped at `opts?.limit ?? DECK_SIZE_LIMIT`. Parse the response, merge `sentence`/`occurrences` back from the matching candidate by `token`, and drop any entry that doesn't match a candidate or is missing a field. **Fallback** (AI call throws, or the response isn't valid parseable JSON matching this shape): rank candidates not in `knownWords` by `occurrences` descending, take the top `limit`, with `reason: 'frequency fallback (AI unavailable)'` and `priorityScore` equal to `occurrences`.

- [ ] **Step 1: Write the failing tests**

```ts
const fakeClient = (response: string): AIClient => ({ complete: vi.fn().mockResolvedValue(response) });

test('ranks and merges the AI response back onto the original candidates', async () => {
  const candidates = [
    { token: 'burro', sentence: 'El burro camina.', occurrences: 3 },
    { token: 'algodonoso', sentence: 'Es algodonoso.', occurrences: 1 },
  ];
  const client = fakeClient(JSON.stringify([
    { token: 'algodonoso', reason: 'rare, descriptive', priorityScore: 0.9 },
    { token: 'burro', reason: 'frequent, central to the story', priorityScore: 0.7 },
  ]));
  const result = await prioritizeWords(client, candidates, []);
  expect(result).toEqual([
    { token: 'algodonoso', sentence: 'Es algodonoso.', occurrences: 1, reason: 'rare, descriptive', priorityScore: 0.9 },
    { token: 'burro', sentence: 'El burro camina.', occurrences: 3, reason: 'frequent, central to the story', priorityScore: 0.7 },
  ]);
});

test('falls back to frequency ranking when the AI client throws', async () => {
  const candidates = [{ token: 'a', sentence: 's1', occurrences: 1 }, { token: 'b', sentence: 's2', occurrences: 5 }];
  const client: AIClient = { complete: vi.fn().mockRejectedValue(new Error('down')) };
  const result = await prioritizeWords(client, candidates, []);
  expect(result.map(r => r.token)).toEqual(['b', 'a']);
  expect(result[0].reason).toBe('frequency fallback (AI unavailable)');
});

test('falls back when the AI response is not valid JSON', async () => {
  const result = await prioritizeWords(fakeClient('not json'), [{ token: 'a', sentence: 's', occurrences: 2 }], []);
  expect(result[0].reason).toBe('frequency fallback (AI unavailable)');
});

test('respects the limit and defaults to DECK_SIZE_LIMIT', async () => {
  const many = Array.from({ length: 20 }, (_, i) => ({ token: `w${i}`, sentence: 's', occurrences: 20 - i }));
  const client: AIClient = { complete: vi.fn().mockRejectedValue(new Error('down')) }; // fallback path keeps this deterministic
  expect(await prioritizeWords(client, many, [])).toHaveLength(DECK_SIZE_LIMIT);
});

test('a section where every candidate is already known returns an empty deck, not an error', async () => {
  const client: AIClient = { complete: vi.fn().mockRejectedValue(new Error('down')) };
  const result = await prioritizeWords(client, [{ token: 'burro', sentence: 's', occurrences: 2 }], ['burro']);
  expect(result).toEqual([]);
});
```

- [ ] **Step 2: Run, confirm failure.**
- [ ] **Step 3: Implement** per the behavior described above.
- [ ] **Step 4: Run, confirm pass.**
- [ ] **Step 5: Commit.**

```bash
git add lib/ai/prioritize.ts lib/ai/prioritize.test.ts
git commit -m "feat: add AI word prioritization with a frequency fallback"
```

---

### Task 10: AI Context-Sense Definitions

**Files:**
- Create: `lib/ai/contextSense.ts`
- Test: `lib/ai/contextSense.test.ts`

**Interfaces:**
- Consumes: `AIClient` (Task 8); `WordSense` (Task 0).
- Produces:
```ts
export async function getContextSense(client: AIClient, word: { token: string; sentence: string }): Promise<WordSense>;
```

**Behavior:** prompts the model for JSON `{ definitionEn, translationEn, exampleEs }`, resolving the word's sense from the given `sentence` rather than its most common dictionary sense. Validates all three fields are non-empty strings. **Fallback** (AI throws, or response is invalid): return `{ token: word.token, sentence: word.sentence, definitionEn: '(definition unavailable)', translationEn: word.token, exampleEs: word.sentence }`.

- [ ] **Step 1: Write the failing tests**

```ts
test('parses a valid AI response into a WordSense', async () => {
  const client: AIClient = { complete: vi.fn().mockResolvedValue(JSON.stringify({
    definitionEn: 'a small donkey', translationEn: 'donkey', exampleEs: 'El burro es pequeño.',
  })) };
  const result = await getContextSense(client, { token: 'burro', sentence: 'El burro camina.' });
  expect(result).toEqual({ token: 'burro', sentence: 'El burro camina.', definitionEn: 'a small donkey', translationEn: 'donkey', exampleEs: 'El burro es pequeño.' });
});

test('falls back to a placeholder sense when the AI client throws', async () => {
  const client: AIClient = { complete: vi.fn().mockRejectedValue(new Error('down')) };
  const result = await getContextSense(client, { token: 'burro', sentence: 'El burro camina.' });
  expect(result.definitionEn).toBe('(definition unavailable)');
  expect(result.translationEn).toBe('burro');
});

test('falls back when the AI response is missing a required field', async () => {
  const client: AIClient = { complete: vi.fn().mockResolvedValue(JSON.stringify({ definitionEn: 'x' })) };
  const result = await getContextSense(client, { token: 'burro', sentence: 'El burro camina.' });
  expect(result.definitionEn).toBe('(definition unavailable)');
});
```

- [ ] **Step 2: Run, confirm failure.**
- [ ] **Step 3: Implement** per the behavior above.
- [ ] **Step 4: Run, confirm pass.**
- [ ] **Step 5: Commit.**

```bash
git add lib/ai/contextSense.ts lib/ai/contextSense.test.ts
git commit -m "feat: add AI context-aware word sense/definition lookup"
```

---

### Task 11: MyMemory Translation Client (Tap-to-Add Path)

**Files:**
- Create: `lib/translate/mymemory.ts`
- Test: `lib/translate/mymemory.test.ts`

**Interfaces:**
- Produces:
```ts
export interface TranslationResult { translatedText: string; }
export async function translateWord(word: string, opts?: { from?: string; to?: string }): Promise<TranslationResult>;
```

**Behavior:** `GET https://api.mymemory.translated.net/get?q=<encodeURIComponent(word)>&langpair=<from ?? 'es'>|<to ?? 'en'>`, appending `&de=<MYMEMORY_EMAIL>` when that env var is set. Parse `responseData.translatedText`. **Fallback** (fetch rejects, response not ok, or `translatedText` missing): return `{ translatedText: word }`.

- [ ] **Step 1: Write the failing tests**

```ts
test('translateWord parses the MyMemory response and defaults to es->en', async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ responseData: { translatedText: 'donkey' } }) });
  await expect(translateWord('burro')).resolves.toEqual({ translatedText: 'donkey' });
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('langpair=es%7Cen'));
});

test('translateWord echoes the original word when the request fails', async () => {
  global.fetch = vi.fn().mockRejectedValue(new Error('network down'));
  await expect(translateWord('burro')).resolves.toEqual({ translatedText: 'burro' });
});

test('translateWord echoes the original word on a malformed response body', async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  await expect(translateWord('burro')).resolves.toEqual({ translatedText: 'burro' });
});
```

- [ ] **Step 2: Run, confirm failure.**
- [ ] **Step 3: Implement** per the behavior above.
- [ ] **Step 4: Run, confirm pass.**
- [ ] **Step 5: Commit.**

```bash
git add lib/translate/mymemory.ts lib/translate/mymemory.test.ts
git commit -m "feat: add MyMemory translation client for the tap-to-add path"
```

---

### Task 12: Deck Service & Gameplay API Routes

**Files:**
- Create: `lib/services/deckService.ts`
- Create: `app/api/sections/[sectionId]/deck/route.ts`
- Create: `app/api/sections/[sectionId]/gate/route.ts`
- Create: `app/api/sections/[sectionId]/text/route.ts`
- Create: `app/api/cards/[cardId]/review/route.ts`
- Create: `app/api/words/tap/route.ts`
- Test: `lib/services/deckService.test.ts`, one `route.test.ts` colocated per route file

**Interfaces:**
- Consumes: `getSection` (Task 3); `extractCandidates` (Task 2); `createOpenAIClient` (Task 8); `prioritizeWords` (Task 9), `getContextSense` (Task 10); `translateWord` (Task 11); `getKnownWords`/`markWordsKnown`/`isSectionUnlocked`/`unlockSection` (Task 7); `getCard`/`getCardsForSection`/`upsertCard`/`createCardIfMissing` (Task 6); `appendReview` (Task 6); `nextSM2State` (Task 4); `computeGateStatus` (Task 5); `withCache` (Task 8); `normalizeToken` (Task 1).
- Produces:
```ts
// deckService.ts
export interface DeckWord extends WordSense { reason: string; priorityScore: number; card: CardState; }
export async function buildDeck(sectionId: string): Promise<{ sectionId: string; words: DeckWord[] }>;
```

**`buildDeck(sectionId)` composition (exact — this is the core gameplay pipeline):**
1. `section = getSection(sectionId)`; if undefined, throw (caller/route turns this into a 404).
2. `candidates = extractCandidates(section.text)`.
3. `known = getKnownWords()`.
4. `client = createOpenAIClient(process.env.OPENAI_API_KEY!, process.env.OPENAI_MODEL)`.
5. `prioritized = await withCache(`prioritize:${sectionId}`, () => prioritizeWords(client, candidates, known))`.
6. For each word in `prioritized`: `sense = await withCache(`sense:${sectionId}:${word.token}`, () => getContextSense(client, word))`; `card = createCardIfMissing(sectionId, word.token)`.
7. Return `{ sectionId, words: prioritized.map(... merge sense + card ...) }`.

**Routes (Next.js 15 async-params signature, e.g. `export async function GET(request: Request, { params }: { params: Promise<{ sectionId: string }> })`, then `const { sectionId } = await params;`):**
- `GET /api/sections/[sectionId]/deck` → calls `buildDeck`; 404 JSON `{ error: 'not found' }` if the section doesn't exist; else 200 with the deck.
- `GET /api/sections/[sectionId]/gate` → `status = computeGateStatus(getCardsForSection(sectionId))`; if `status.passed`, call `unlockSection(sectionId)`; return 200 `{ ...status, unlocked: isSectionUnlocked(sectionId) }`.
- `GET /api/sections/[sectionId]/text` → 403 `{ error: 'locked' }` if `!isSectionUnlocked(sectionId)`; else 404 if `getSection` is undefined; else 200 `{ sectionId, title, text }`.
- `POST /api/cards/[cardId]/review`, body `{ grade: Grade }` → split `cardId` on the last `:` into `sectionId`/`token`; 404 if `getCard(sectionId, token)` is undefined; else `next = nextSM2State(card, grade)`, `updated = { ...card, ...next, lastGrade: grade, dueAt: new Date(Date.now() + next.interval * 86400000).toISOString() }`, `upsertCard(updated)`, `appendReview({ cardId, grade, gradedAt: new Date().toISOString() })`, and if `grade !== 'again'` call `markWordsKnown([token])`; return 200 `{ card: updated, gate: computeGateStatus(getCardsForSection(sectionId)) }`.
- `POST /api/words/tap`, body `{ sectionId: string; token: string; sentence: string }` → `translation = await translateWord(token)`; `card = createCardIfMissing(sectionId, normalizeToken(token))`; return 200 `{ translation: translation.translatedText, card }`.

- [ ] **Step 1: Write the failing tests.** `deckService.test.ts` mocks `@/lib/ai/client`, `@/lib/ai/prioritize`, `@/lib/ai/contextSense` with `vi.mock` and asserts `buildDeck` merges sense + card correctly and throws for an unknown section. Each route's test mocks `@/lib/services/deckService` (or the lower-level modules it uses) and exercises: the happy path (200 with the expected shape) and the stated error path (404/403) for that route — e.g. for the review route, one test posting `{ grade: 'good' }` against a pre-created card and asserting the returned `card.repetitions === 1` and `gate` is present; another posting against a nonexistent `cardId` asserting a 404.
- [ ] **Step 2: Run, confirm failure.**
- [ ] **Step 3: Implement** `deckService.ts` and the five route files exactly per the composition/behavior above.
- [ ] **Step 4: Run, confirm pass.**
- [ ] **Step 5: Commit.**

```bash
git add lib/services/deckService.ts app/api lib/services/deckService.test.ts
git commit -m "feat: add deck-building service and gameplay API routes"
```

---

### Task 13: Flashcard Study & Gate UI

**Files:**
- Create: `components/SectionList.tsx`, `components/FlashcardView.tsx`, `components/GateStatusView.tsx`
- Create: `app/page.tsx` (replace placeholder), `app/sections/[sectionId]/study/page.tsx`, `app/sections/[sectionId]/gate/page.tsx`
- Test: `components/FlashcardView.test.tsx`, `components/GateStatusView.test.tsx`

**Interfaces:**
- Consumes: `loadBook`, `DEMO_BOOK_ID` (Task 3); `isSectionUnlocked` (Task 7); `buildDeck` (Task 12); `Grade`, `GateStatus`, `WordSense` (Task 0); `POST /api/cards/[cardId]/review` (Task 12).
- Produces:
```tsx
export interface FlashcardViewProps { word: WordSense; onGrade: (grade: Grade) => void; }
export function FlashcardView(props: FlashcardViewProps): JSX.Element;

export interface GateStatusViewProps { status: GateStatus; }
export function GateStatusView(props: GateStatusViewProps): JSX.Element;

export interface SectionListProps { sections: { id: string; title: string; unlocked: boolean }[]; }
export function SectionList(props: SectionListProps): JSX.Element;
```

- [ ] **Step 1: Write the failing component tests**

```tsx
test('FlashcardView reveals the answer and reports the selected grade', async () => {
  const onGrade = vi.fn();
  render(<FlashcardView word={{ token: 'burro', sentence: 'El burro camina.', definitionEn: 'donkey', translationEn: 'donkey', exampleEs: 'El burro es gris.' }} onGrade={onGrade} />);
  expect(screen.queryByText('donkey')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /show answer/i }));
  expect(screen.getByText('donkey')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /^good$/i }));
  expect(onGrade).toHaveBeenCalledWith('good');
});

test('GateStatusView shows unlocked messaging when passed, study messaging otherwise', () => {
  const { rerender } = render(<GateStatusView status={{ recognizedCount: 4, totalCount: 5, recognitionRate: 0.8, passed: true }} />);
  expect(screen.getByText(/unlocked/i)).toBeInTheDocument();
  rerender(<GateStatusView status={{ recognizedCount: 1, totalCount: 5, recognitionRate: 0.2, passed: false }} />);
  expect(screen.getByText(/keep studying/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run, confirm failure.**
- [ ] **Step 3: Implement the two components.** `FlashcardView`: front shows `word.sentence` with `word.token` emphasized and a "Show answer" button; once revealed, shows `definitionEn`/`translationEn`/`exampleEs` and four buttons labeled Again/Hard/Good/Easy that call `onGrade('again'|'hard'|'good'|'easy')`. `GateStatusView`: renders `recognitionRate` as a percentage and either "Section unlocked" (passed) or "Keep studying" (not passed) messaging.
- [ ] **Step 4: Run, confirm pass.**
- [ ] **Step 5: Implement `SectionList` and the three pages** (no dedicated test — thin server-component composition over already-tested pieces):
  - `SectionList`: renders each section with a lock icon when `!unlocked`, linking unlocked sections to `/sections/[id]/read` and locked ones to `/sections/[id]/study`.
  - `app/page.tsx` (server component): `book = loadBook(DEMO_BOOK_ID)`; for each section compute `unlocked = isSectionUnlocked(section.id)`; render `<SectionList sections={...} />`.
  - `app/sections/[sectionId]/study/page.tsx` (server component fetching `deck = await buildDeck(sectionId)`, passed to a small client component that steps through `FlashcardView`s, `POST`ing each grade to `/api/cards/${cardId}/review`, then on the last card `router.push(`/sections/${sectionId}/gate`)`).
  - `app/sections/[sectionId]/gate/page.tsx` (server component calling `computeGateStatus(getCardsForSection(sectionId))` directly, rendering `<GateStatusView>` plus a link to `/sections/[sectionId]/read` when passed or back to `/sections/[sectionId]/study` when not).
- [ ] **Step 6: Commit.**

```bash
git add components/SectionList.tsx components/FlashcardView.tsx components/GateStatusView.tsx components/*.test.tsx app/page.tsx app/sections
git commit -m "feat: add section picker, flashcard study, and gate pages"
```

---

### Task 14: Reading & Pilot Metrics UI

**Files:**
- Create: `lib/metrics/pilotData.ts`, `components/ReadingView.tsx`, `components/WordPopover.tsx`, `components/MetricsDashboard.tsx`
- Create: `app/sections/[sectionId]/read/page.tsx`, `app/metrics/page.tsx`, `app/api/metrics/route.ts`
- Test: `components/WordPopover.test.tsx`, `components/MetricsDashboard.test.tsx`

**Interfaces:**
- Consumes: `isSectionUnlocked`, `getSection` (Tasks 3, 7); `POST /api/words/tap` (Task 12).
- Produces:
```ts
export interface PilotMetrics {
  recognitionRateBySection: { section: string; rate: number }[];
  sectionsPerWeek: { learner: string; before: number; after: number }[];
  retentionAfterDays: { days: number; retainedRate: number }[];
}
export function getPilotMetrics(): PilotMetrics;
```
```tsx
export interface WordPopoverProps { sectionId: string; token: string; sentence: string; onClose: () => void; }
export function WordPopover(props: WordPopoverProps): JSX.Element;

export interface ReadingViewProps { sectionId: string; text: string; }
export function ReadingView(props: ReadingViewProps): JSX.Element;

export interface MetricsDashboardProps { metrics: PilotMetrics; }
export function MetricsDashboard(props: MetricsDashboardProps): JSX.Element;
```

- [ ] **Step 1: Write the failing component tests**

```tsx
test('WordPopover fetches and shows a translation, then closes', async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ translation: 'donkey', card: { id: 'x' } }) });
  const onClose = vi.fn();
  render(<WordPopover sectionId="sec-1" token="burro" sentence="El burro camina." onClose={onClose} />);
  expect(await screen.findByText('donkey')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /close/i }));
  expect(onClose).toHaveBeenCalled();
});

test('MetricsDashboard labels the data as pilot data and renders each metric', () => {
  const metrics: PilotMetrics = {
    recognitionRateBySection: [{ section: 'I', rate: 0.82 }],
    sectionsPerWeek: [{ learner: 'A', before: 1, after: 3 }],
    retentionAfterDays: [{ days: 7, retainedRate: 0.75 }],
  };
  render(<MetricsDashboard metrics={metrics} />);
  expect(screen.getByText(/pilot/i)).toBeInTheDocument();
  expect(screen.getByText(/82%/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run, confirm failure.**
- [ ] **Step 3: Implement.** `pilotData.ts`: `getPilotMetrics` returns a small hardcoded illustrative sample (3–5 points per metric, consistent with the three metrics defined in the spec) clearly meant as sample/pilot data, not live demo output. `WordPopover`: on mount, `POST /api/words/tap` with `{ sectionId, token, sentence }`, shows a loading state then the returned translation, with a close button calling `onClose`. `ReadingView`: splits `text` into word/whitespace tokens, wraps each word in a clickable `<span>` that opens a `WordPopover` for that word with its containing sentence. `MetricsDashboard`: renders the three metric lists under a heading that includes the word "pilot".
- [ ] **Step 4: Run, confirm pass.**
- [ ] **Step 5: Implement the two pages and the metrics route** (no dedicated test — thin composition):
  - `app/api/metrics/route.ts`: `GET` returns 200 `getPilotMetrics()`.
  - `app/sections/[sectionId]/read/page.tsx` (server component): 403/redirect if `!isSectionUnlocked(sectionId)`; else `section = getSection(sectionId)`, render `<ReadingView sectionId={sectionId} text={section.text} />`.
  - `app/metrics/page.tsx` (server component): `metrics = getPilotMetrics()`, render `<MetricsDashboard metrics={metrics} />`.
- [ ] **Step 6: Commit.**

```bash
git add lib/metrics/pilotData.ts components/ReadingView.tsx components/WordPopover.tsx components/MetricsDashboard.tsx components/*.test.tsx app/sections app/metrics app/api/metrics
git commit -m "feat: add reading view with tap-to-add words and a pilot metrics dashboard"
```

---

### Task 15: Demo Seed Script

**Files:**
- Create: `scripts/seedDemo.ts`

**Interfaces:**
- Consumes: `loadBook`, `DEMO_BOOK_ID`, `getSection` (Task 3); `extractCandidates` (Task 2); `markWordsKnown`, `unlockSection` (Task 7); `buildDeck` (Task 12).

**Behavior (exact):**
1. `book = loadBook(DEMO_BOOK_ID)`; `section0 = book.sections[0]`, `section1 = book.sections[1]`.
2. Mark `section0` as already mastered: `candidates0 = extractCandidates(section0.text)`; `markWordsKnown(candidates0.map(c => c.token))`; `unlockSection(section0.id)`.
3. Pre-warm the AI cache for the live-demo section: `await buildDeck(section1.id)` (requires a real `OPENAI_API_KEY` in the environment running the script).
4. `console.log` a summary: which section is pre-mastered/unlocked, which section is the live-demo target, and confirmation the AI cache was warmed for it.

- [ ] **Step 1: Implement `scripts/seedDemo.ts`** per the behavior above, runnable as `npm run seed:demo` (script already added in Task 0).
- [ ] **Step 2: Verify manually.** With a real `OPENAI_API_KEY` set and `WORDBOOK_DATA_DIR` pointed at a fresh directory, run `npm run seed:demo`; confirm the console summary, that `data/runtime/learner.json` shows `section0`'s id in `unlockedSections` and its words in `knownWords`, and that `data/runtime/ai-cache/` contains files for `section1`.
- [ ] **Step 3: Commit** (the script only — `data/runtime/` stays gitignored).

```bash
git add scripts/seedDemo.ts
git commit -m "feat: add demo-day seed script to pre-master section 1 and warm the AI cache"
```

---

## Self-Review Notes

- **Spec coverage:** every element of the design doc's "smallest prototype to test" flow (extract → filter → enrich → SRS study → gate → unlock → read → tap-to-add) maps to Tasks 1–2 (extract/filter), 9–10 (AI enrich), 4 (SRS), 5 (gate), 12 (wiring), 13–14 (UI). The "why AI" differentiator (word prioritization + context-sense) is Tasks 9–10, not a dictionary dump. The builder-check resolutions (MyMemory scope, demo-day caching, pre-seeded baseline, single-section demo depth) are encoded as Global Constraints and built in Tasks 11, 8/15, 15, and 14 respectively.
- **Review Focus:** all five listed items have an owning task with a pinned-down test (see the Review Focus section's task references).
- **Type/signature consistency:** `Grade`, `CardState`, `GateStatus`, `CandidateWord`, `PrioritizedWord`, `WordSense`, `SM2State`, `ReviewLogEntry` are all defined once in Task 0 and referenced, never redefined, by every later task.
- **Out of scope confirmed by the design doc, not built here:** EPUB/PDF parsing, multi-language support, auth/multi-user accounts, a production database, mobile app, Vercel deployment (stretch goal, not required for Demo Day).
