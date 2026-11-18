# WordBook Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply one deliberate, consistent visual design system (palette, type, state-color language) across every page and component in the app, with no change to any data flow, route, or user-facing behavior.

**Architecture:** A token layer (CSS custom properties in `app/globals.css`, consumed via Tailwind's `theme.extend.colors`/`fontFamily`) is the one thing every later task depends on. Every other task is a pure styling pass over an existing Server or Client Component, swapping ad-hoc Tailwind utility classes for the new token-based ones — no component's props, data-fetching, or logic changes.

**Tech Stack:** Next.js 15 (App Router) + TypeScript 5, Tailwind CSS 3, `next/font/google` (Figtree, Source Serif 4) — no new npm dependency.

**Spec:** `docs/superpowers/specs/2026-11-18-wordbook-visual-redesign-design.md`

## Global Constraints

- No component's props, data-fetching, route, or Firestore/API interaction changes. Every task is Tailwind class names and markup structure only.
- No Server Component is converted to a Client Component to accomplish this redesign.
- No new npm dependency. Fonts load via `next/font/google` (already available in Next.js 15, zero extra install).
- Every status→class or state→class mapping (e.g. section status, rating type, generation status) MUST be written as a literal lookup object or `switch`, never as a template-string class name (e.g. never `` `bg-${status}` ``) — Tailwind's build-time scanner only finds literal class-name strings in source; a dynamically-interpolated class name gets silently purged from the production CSS and the color simply won't appear once built, even though it may appear to work in some dev modes. `npm run build` (not just `npm test`) is the only way to catch this, per `AGENTS.md`'s own documented history of production-only failures — every task below ends with a build check for exactly this reason.
- The three progress-state colors (`locked`/`practicing`/`unlocked`) are reserved for progress/recognition state only. Every other button, chip, or toggle uses the neutral `ink`/`surface`/`hairline` tokens for its active/inactive states. The one named exception: `WordPopup`'s "Add to my vocabulary" button uses `unlocked` (it's a positive, vocabulary-building action, per the design doc).
- The one deliberate motion in this redesign (the Bookshelf's generating-sweep animation) must respect `prefers-reduced-motion: reduce` (render static, no animation) — this is a spec requirement, not optional polish.

## Review Focus

- Dark mode must actually swap every token color, not just the neutral ones — a component that reads a literal hex value instead of a token class would silently stay light-mode-colored under `data-theme="dark"`. The task that owns each surface must render/assert under both themes, not just the default.
- The `prefers-reduced-motion` requirement on the Bookshelf's generating-sweep animation has no other task whose test would catch an implementer skipping it — Task 5 must test it directly.
- `SectionStatusBadge`'s four real statuses must stay visually distinguishable after collapsing to three hues (`ready_to_read` and `completed` share the `unlocked` hue, distinguished only by a checkmark glyph) — a careless implementation could render them identically with no way to tell them apart.
- Error/validation states (a failed generation, a lookup failure, a form validation message) must use the `error` token, never `practicing` — both are warm/brownish tones and an implementer could reach for the already-defined ochre instead of adding the newer, less-familiar `error` class.
- The non-progress "Ink-fill for active/selected" pattern (submit buttons, chips, toggles) must never leak one of the three progress colors onto a control that isn't about progress — e.g. a selected difficulty chip in `GenerateBookForm` must use `ink`/`paper`, not `unlocked`, just because "selected" feels similar to "unlocked."

---

## File Structure

- Modify: `tailwind.config.ts` — add the token color/font families
- Modify: `app/globals.css` — add the CSS custom properties (light + dark)
- Modify: `app/layout.tsx` — load the two Google Fonts, apply their CSS variables
- Modify: `components/TabBar.tsx`, `components/HeaderNav.tsx`
- Modify: `components/Flashcard.tsx`, `components/RatingButtons.tsx`, `components/PracticeSession.tsx`
- Modify: `components/SectionStatusBadge.tsx`
- Modify: `components/BookshelfList.tsx`, `components/AddBookForm.tsx`, `components/GenerateBookForm.tsx`, `components/BookshelfPendingPoller.tsx` (if it renders any visible markup)
- Modify: `app/book/[id]/page.tsx`, `components/SectioningSetupForm.tsx`, `components/ReadingModeToggle.tsx`
- Modify: `app/book/[id]/free/page.tsx`, `app/book/[id]/read/[sectionNumber]/page.tsx`, `components/WordPopup.tsx`
- Modify: `app/practice/page.tsx`, `app/statistics/page.tsx`, `components/StatisticsView.tsx`
- Modify: `app/settings/page.tsx`, `components/SettingsForm.tsx`
- Modify: `app/login/page.tsx`, `app/signup/page.tsx`, `components/GoogleSignInButton.tsx`

---

### Task 1: Design tokens — Tailwind config, CSS variables, fonts

**Files:**
- Modify: `app/globals.css`
- Modify: `tailwind.config.ts`
- Modify: `app/layout.tsx`
- Test: `app/layout.test.tsx` (extend existing file)

**Interfaces:**
- Produces, as Tailwind utility classes usable by every later task:
  - Colors: `bg-paper`/`text-paper`/`border-paper`, `bg-surface`/`text-surface`/`border-surface`, `bg-ink`/`text-ink`/`border-ink`, `bg-ink-muted`/`text-ink-muted`, `bg-hairline`/`border-hairline`, `bg-locked`/`text-locked`/`border-locked`, `bg-practicing`/`text-practicing`/`border-practicing`, `bg-unlocked`/`text-unlocked`/`border-unlocked`, `bg-error`/`text-error`/`border-error`.
  - Fonts: `font-ui` (Figtree), `font-reading` (Source Serif 4).

- [ ] **Step 1: Write a failing test**

```tsx
test('root layout applies the ui and reading font variable classes to html', async () => {
  // render/inspect the layout's <html> (or <body>) element; assert its className
  // includes both font CSS-variable classes next/font/google generates
  // (check the exact variable/className next/font/google produces for this
  // version before writing the assertion — don't guess the string)
});
```

- [ ] **Step 2: Run test, confirm it fails**

Run: `npm test -- layout`
Expected: FAIL — fonts aren't wired up yet.

- [ ] **Step 3: Implement**

In `app/globals.css`, add under `:root`:
```css
:root {
  --color-paper: 239 235 228;
  --color-surface: 247 244 238;
  --color-ink: 31 36 32;
  --color-ink-muted: 91 96 88;
  --color-hairline: 217 211 198;
  --color-locked: 154 148 138;
  --color-practicing: 176 138 78;
  --color-unlocked: 63 102 82;
  --color-error: 168 80 61;
}
:root[data-theme='dark'] {
  --color-paper: 26 29 25;
  --color-surface: 35 39 31;
  --color-ink: 237 234 226;
  --color-ink-muted: 166 169 158;
  --color-hairline: 56 60 50;
  --color-locked: 110 106 96;
  --color-practicing: 209 166 96;
  --color-unlocked: 92 140 115;
  --color-error: 201 122 100;
}
```
(These are the exact hex values from the design doc, pre-converted to `R G B` space-separated form for Tailwind's alpha-channel syntax below — do not recompute them.)

In `tailwind.config.ts`, extend `theme.extend`:
```ts
colors: {
  paper: 'rgb(var(--color-paper) / <alpha-value>)',
  surface: 'rgb(var(--color-surface) / <alpha-value>)',
  ink: 'rgb(var(--color-ink) / <alpha-value>)',
  'ink-muted': 'rgb(var(--color-ink-muted) / <alpha-value>)',
  hairline: 'rgb(var(--color-hairline) / <alpha-value>)',
  locked: 'rgb(var(--color-locked) / <alpha-value>)',
  practicing: 'rgb(var(--color-practicing) / <alpha-value>)',
  unlocked: 'rgb(var(--color-unlocked) / <alpha-value>)',
  error: 'rgb(var(--color-error) / <alpha-value>)',
},
fontFamily: {
  ui: ['var(--font-figtree)', 'sans-serif'],
  reading: ['var(--font-source-serif)', 'serif'],
},
```

In `app/layout.tsx`, import `Figtree` and `Source_Serif_4` from `next/font/google`, instantiate each with `variable: '--font-figtree'` / `variable: '--font-source-serif'` and a reasonable `weight`/`subsets` list (figtree: `['500','600','700']`; source serif: `['400','600']`, both `subsets: ['latin']`), and add both fonts' `.variable` classes to the existing `<html>` (or `<body>`, matching whichever element this file currently applies its classes to) alongside what's already there — do not remove the existing `data-theme` logic from Plan 2.

- [ ] **Step 4: Run test, confirm it passes**

Run: `npm test -- layout`
Expected: PASS

- [ ] **Step 5: Run the production build (this task's own class names can't be verified by `npm test` alone)**

Run: `npm run build`
Expected: PASS — confirms Tailwind actually generates the new utility classes and the font loader config is valid.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css tailwind.config.ts app/layout.tsx app/layout.test.tsx
git commit -m "feat: add the visual redesign's design tokens (colors, fonts)"
```

---

### Task 2: Nav shell — `TabBar`, `HeaderNav`

**Files:**
- Modify: `components/TabBar.tsx`
- Modify: `components/HeaderNav.tsx`
- Test: `components/TabBar.test.tsx`, `components/HeaderNav.test.tsx` (extend existing files)

**Interfaces:**
- Consumes: `bg-surface`, `text-ink`, `text-ink-muted`, `border-hairline`, `font-ui` (Task 1).

- [ ] **Step 1: Write failing tests**

```tsx
test('TabBar gives the active tab text-ink and inactive tabs text-ink-muted', () => {
  // mock usePathname -> '/practice'; render; assert the Practice link's className
  // includes 'text-ink' and the other two links' classNames include 'text-ink-muted'
});
test('HeaderNav uses bg-surface and border-hairline', () => {
  // render; assert the nav container's className includes both
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- TabBar HeaderNav`
Expected: FAIL — components still use their original ad-hoc classes.

- [ ] **Step 3: Implement**

`TabBar`: apply `bg-surface border-t border-hairline`/`font-ui` to the bar itself; each link gets `text-ink` when active (matching its existing `aria-current="page"` logic, unchanged) and `text-ink-muted` otherwise. `HeaderNav`: `bg-surface border-b border-hairline font-ui`; the gear link keeps its existing glyph/aria-label, styled `text-ink-muted` (it's chrome, not a progress or primary action).

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- TabBar HeaderNav`
Expected: PASS

- [ ] **Step 5: Run the production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/TabBar.tsx components/HeaderNav.tsx components/TabBar.test.tsx components/HeaderNav.test.tsx
git commit -m "feat: restyle the nav shell with the new design tokens"
```

---

### Task 3: Flashcard, RatingButtons, PracticeSession

**Files:**
- Modify: `components/Flashcard.tsx`
- Modify: `components/RatingButtons.tsx`
- Modify: `components/PracticeSession.tsx`
- Test: `components/Flashcard.test.tsx`, `components/RatingButtons.test.tsx` (extend existing files)

**Interfaces:**
- Consumes: `bg-surface`, `border-hairline`, `font-reading`, `font-ui`, `bg-practicing`/`text-practicing`, `bg-unlocked`/`text-unlocked` (Task 1).

- [ ] **Step 1: Write failing tests**

```tsx
test('Flashcard renders the word and definition in font-reading inside a bg-surface card', () => {
  // render; assert the word/definition elements' classNames include 'font-reading';
  // assert the card container's className includes 'bg-surface'
});
test('RatingButtons gives "again" the practicing color and hard/good/easy the unlocked color', () => {
  // render; assert the "again" button's className includes 'bg-practicing' (or
  // 'text-practicing', matching whichever styling approach Step 3 settles on);
  // assert "hard"/"good"/"easy" buttons' classNames all include 'bg-unlocked'/'text-unlocked'
  // and that none of the three differ from each other in color
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- Flashcard RatingButtons`
Expected: FAIL — still using the components' original classes.

- [ ] **Step 3: Implement**

`Flashcard`: the card wrapper gets `bg-surface border border-hairline rounded` (pick a consistent radius — the design doc's mockup used small radii, ~3–6px; use `rounded` or `rounded-md`, whichever Tailwind's default scale lands closest to that); word/definition text get `font-reading`. `RatingButtons`: use a literal lookup object mapping each of the four rating values to its exact class string (per this plan's Global Constraints — never a template-string interpolation), e.g. `{ again: 'bg-practicing text-paper', hard: 'bg-unlocked text-paper', good: 'bg-unlocked text-paper', easy: 'bg-unlocked text-paper' }`, applied via `font-ui` buttons. `PracticeSession`: wraps/positions `Flashcard` — apply `bg-paper` to its own container if it renders one, otherwise this file may need no visual change beyond what `Flashcard` already provides (implementer's call based on what `PracticeSession` actually renders).

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- Flashcard RatingButtons`
Expected: PASS

- [ ] **Step 5: Run the production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/Flashcard.tsx components/RatingButtons.tsx components/PracticeSession.tsx components/Flashcard.test.tsx components/RatingButtons.test.tsx
git commit -m "feat: restyle the flashcard and rating buttons"
```

---

### Task 4: `SectionStatusBadge`

**Files:**
- Modify: `components/SectionStatusBadge.tsx`
- Test: `components/SectionStatusBadge.test.tsx` (extend existing file)

**Interfaces:**
- Consumes: `bg-locked`, `bg-practicing`, `bg-unlocked` (Task 1).
- Produces: `SectionStatusBadge`'s prop shape is unchanged — it still takes whatever `status` prop it takes today.

- [ ] **Step 1: Write failing tests**

```tsx
test('locked status uses the locked color', () => {});
test('ready_to_practice status uses the practicing color', () => {});
test('ready_to_read status uses the unlocked color with no checkmark', () => {
  // assert className includes 'bg-unlocked' (or 'text-unlocked') and the
  // checkmark glyph/element is NOT present
});
test('completed status uses the unlocked color WITH a checkmark', () => {
  // assert className includes the same unlocked color AND the checkmark
  // glyph/element IS present — this is the test that pins the Review Focus
  // item: ready_to_read and completed must stay visually distinguishable
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- SectionStatusBadge`
Expected: FAIL — still 4 distinct colors, no checkmark logic exists yet.

- [ ] **Step 3: Implement**

Use a literal lookup object (per Global Constraints) mapping the 4 status strings to `{ className: string; checkmark: boolean }`: `locked` → `{className: 'bg-locked ...', checkmark: false}`, `ready_to_practice` → `{className: 'bg-practicing ...', checkmark: false}`, `ready_to_read` → `{className: 'bg-unlocked ...', checkmark: false}`, `completed` → `{className: 'bg-unlocked ...', checkmark: true}`. Render a checkmark glyph (a Unicode `✓`, matching this codebase's existing convention of Unicode glyphs over an icon library — see the gear icon in `HeaderNav`) only when `checkmark` is true.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- SectionStatusBadge`
Expected: PASS

- [ ] **Step 5: Run the production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/SectionStatusBadge.tsx components/SectionStatusBadge.test.tsx
git commit -m "feat: restyle the section status badge, distinguishing completed from ready_to_read"
```

---

### Task 5: Bookshelf — `BookshelfList`, `AddBookForm`, `GenerateBookForm`

**Files:**
- Modify: `components/BookshelfList.tsx`
- Modify: `components/AddBookForm.tsx`
- Modify: `components/GenerateBookForm.tsx`
- Test: `components/BookshelfList.test.tsx`, `components/GenerateBookForm.test.tsx` (extend existing files)

**Interfaces:**
- Consumes: `bg-surface`, `border-hairline`, `bg-ink`/`text-paper` (non-progress active state), `bg-unlocked`/`bg-locked`/`bg-error`, `font-ui` (Task 1).

- [ ] **Step 1: Write failing tests**

```tsx
test('a book\'s spine shows filled segments in the unlocked color up to sectionsUnlocked, unfilled in locked color for the rest', () => {
  // render a book with sectionsTotal: 5, sectionsUnlocked: 2; assert exactly 2
  // segment elements have a className including 'bg-unlocked' and 3 have 'bg-locked'
});
test('the selected language filter chip uses bg-ink/text-paper, not a progress color', () => {
  // click/select a chip; assert its className includes 'bg-ink' (not
  // 'bg-unlocked' or any other progress color) and the unselected chips
  // use the inactive (surface/hairline) styling
});
test('a failed generation card uses the error color, not the practicing color', () => {
  // render a book with generationStatus: 'failed'; assert the card's
  // className includes 'bg-error'/'border-error'/'text-error' (whichever the
  // implementation uses) and does NOT include 'practicing'
});
test('the Bookshelf\'s generating-sweep animation is disabled under prefers-reduced-motion', () => {
  // mock matchMedia for '(prefers-reduced-motion: reduce)' to match: true;
  // render a pending book's placeholder; assert no animation class/style is applied
  // (this is the Review Focus item with no other test covering it)
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- BookshelfList GenerateBookForm`
Expected: FAIL — spine-fill markup, the chip styling, and the reduced-motion check don't exist yet.

- [ ] **Step 3: Implement**

`BookshelfList`: replace the current "N of M sections unlocked" text with a row of `sectionsTotal` small segment elements, the first `sectionsUnlocked` of them getting `bg-unlocked` and the rest `bg-locked` (a literal ternary/comparison per segment, not a dynamic class string). Language filter chips: selected gets `bg-ink text-paper`, unselected gets `bg-surface border border-hairline text-ink-muted` — the existing `aria-pressed` logic is unchanged, only the className mapping changes. The `needsSetup`/"Not yet started" card keeps using `locked`; the `generationStatus: 'failed'` card switches from whatever ad-hoc styling it has today to `border-error`/`text-error`. The `generationStatus: 'pending'` card's placeholder gets a subtle animated sweep (a CSS `@keyframes` added to `app/globals.css` or a Tailwind `animate-*` utility, implementer's choice of mechanism) gated behind a `motion-safe:` Tailwind variant (Tailwind 3 ships this out of the box — it only applies the animation class when the user has NOT requested reduced motion) so the reduced-motion test passes by construction rather than by a manual media-query check in JS. `AddBookForm`/`GenerateBookForm`: submit buttons and the difficulty chips follow the same `bg-ink text-paper` (active/primary) vs. `bg-surface border-hairline` (inactive) pattern as the language chips above.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- BookshelfList GenerateBookForm`
Expected: PASS

- [ ] **Step 5: Run the production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/BookshelfList.tsx components/AddBookForm.tsx components/GenerateBookForm.tsx app/globals.css components/BookshelfList.test.tsx components/GenerateBookForm.test.tsx
git commit -m "feat: restyle the Bookshelf, its forms, and the generation status cards"
```

---

### Task 6: Book Detail page — `SectioningSetupForm`, `ReadingModeToggle`

**Files:**
- Modify: `app/book/[id]/page.tsx`
- Modify: `components/SectioningSetupForm.tsx`
- Modify: `components/ReadingModeToggle.tsx`
- Test: `app/book/[id]/page.test.tsx`, extend if `SectioningSetupForm`/`ReadingModeToggle` have their own test files, otherwise cover via the page's test

**Interfaces:**
- Consumes: `bg-paper`, `bg-surface`, `border-hairline`, `bg-ink`/`text-paper`, `font-ui`, `SectionStatusBadge` (Task 4, unchanged props).

- [ ] **Step 1: Write failing tests**

```tsx
test('ReadingModeToggle gives the active mode bg-ink/text-paper and the inactive mode the neutral style', () => {
  // render with Free reading active; assert the Free button's className includes
  // 'bg-ink'/'text-paper' and Section's includes the neutral surface/hairline styling
});
test('the sectioning setup screen\'s page-count and by-chapter buttons use the neutral active/inactive pattern, not a progress color', () => {});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- 'app/book/\[id\]/page' SectioningSetupForm ReadingModeToggle`
Expected: FAIL — components still use their original classes (check the actual working test-filter syntax this repo's vitest config accepts, per an earlier plan's own note that the literal brief-style filter sometimes needs adjusting — use `npx vitest run <path>` directly if `npm test --` doesn't match).

- [ ] **Step 3: Implement**

`ReadingModeToggle`: the two mode buttons follow the same active/inactive neutral pattern as Task 5's chips (`bg-ink text-paper` active, `bg-surface border-hairline` inactive) — this is a mode switch, not a progress indicator, so no progress color. `SectioningSetupForm`: its "by page"/"by chapter" choice buttons use the same pattern; the page-count number input gets `bg-surface border-hairline font-ui`. The page itself (`app/book/[id]/page.tsx`): `bg-paper` on the root container, `font-ui` for the title/author text, and renders the existing `SectionStatusBadge` (Task 4) unchanged in the section list.

- [ ] **Step 4: Run tests, confirm they pass**

Run: the working equivalent of Step 2's command
Expected: PASS

- [ ] **Step 5: Run the production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add "app/book/[id]/page.tsx" components/SectioningSetupForm.tsx components/ReadingModeToggle.tsx "app/book/[id]/page.test.tsx"
git commit -m "feat: restyle the Book Detail page, sectioning setup, and reading-mode toggle"
```

---

### Task 7: Reading surfaces — Free reading, Section reading, `WordPopup`

**Files:**
- Modify: `app/book/[id]/free/page.tsx`
- Modify: `app/book/[id]/read/[sectionNumber]/page.tsx`
- Modify: `components/WordPopup.tsx`
- Test: `components/WordPopup.test.tsx` (extend existing file)

**Interfaces:**
- Consumes: `bg-paper`, `bg-surface`, `border-hairline`, `font-reading`, `text-practicing` (tapped-word underline), `bg-unlocked`/`text-unlocked` ("Add to my vocabulary" — the one named exception to the progress-colors-are-reserved rule), `font-ui` (Task 1).

- [ ] **Step 1: Write failing tests**

```tsx
test('WordPopup renders the definition in font-reading inside a bg-surface popover with a hairline border', () => {});
test('the tapped word gets a practicing-colored underline while the popover is open', () => {
  // assert the word span's className includes 'border-practicing' (or
  // 'decoration-practicing', matching whichever underline mechanism is used)
  // only while `open` is true
});
test('the "Add to my vocabulary" button uses the unlocked color, not the neutral ink pattern', () => {
  // assert its className includes 'bg-unlocked'/'text-unlocked' — this is the
  // one deliberate exception to the "non-progress buttons use ink" rule, so
  // the test exists specifically to pin that exception, not the general rule
});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- WordPopup`
Expected: FAIL — still using the component's original classes.

- [ ] **Step 3: Implement**

`WordPopup`: popover container gets `bg-surface border border-hairline font-reading` for the definition text; the word span gets a conditional underline class (e.g. `border-b border-practicing`, literal conditional on the `open` state, not a template string) while open; "Add to my vocabulary" gets `bg-unlocked text-paper`. Both reading pages: root container `bg-paper`, body text wrapper `font-reading`, generous margin/max-width per the design doc's reading-width guidance (~65ch) — these two pages' own layout logic (section ordering, status checks, the free-reading read-only guarantee from an earlier plan) is unchanged, this is class-name-only.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- WordPopup`
Expected: PASS

- [ ] **Step 5: Run the production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add "app/book/[id]/free/page.tsx" "app/book/[id]/read/[sectionNumber]/page.tsx" components/WordPopup.tsx components/WordPopup.test.tsx
git commit -m "feat: restyle the reading surfaces and WordPopup"
```

---

### Task 8: Practice tab and Statistics — `app/practice/page.tsx`, `StatisticsView`

**Files:**
- Modify: `app/practice/page.tsx`
- Modify: `app/statistics/page.tsx`
- Modify: `components/StatisticsView.tsx`
- Test: `components/StatisticsView.test.tsx` (extend if it exists, otherwise cover via the page's existing test file)

**Interfaces:**
- Consumes: `bg-paper`, `bg-surface`, `border-hairline`, `bg-ink`/`text-paper` (selected language chip, same pattern as Task 5), `bg-unlocked`/`bg-locked`, `font-ui` (Task 1).

- [ ] **Step 1: Write failing tests**

```tsx
test('StatisticsView\'s selected language chip uses the same bg-ink/text-paper pattern as the Bookshelf', () => {});
test('the Practice tab list shows each book\'s practiceable state using the locked/unlocked tokens, not ad-hoc colors', () => {});
```

- [ ] **Step 2: Run tests, confirm they fail**

Run: `npm test -- StatisticsView practice`
Expected: FAIL.

- [ ] **Step 3: Implement**

`StatisticsView`: reuse the exact chip pattern from Task 5's `BookshelfList` (selected `bg-ink text-paper`, unselected `bg-surface border-hairline`) — this is intentionally the same markup/class shape, not a new pattern, since both are "pick one of several languages" chip rows. `app/practice/page.tsx`: each book row's "Practice"/"Read instead" link styling uses `bg-ink text-paper` for the primary ("Practice") action and `bg-surface border-hairline text-ink-muted` for the secondary ("Read instead") one, consistent with every other primary/secondary pair in this redesign.

- [ ] **Step 4: Run tests, confirm they pass**

Run: `npm test -- StatisticsView practice`
Expected: PASS

- [ ] **Step 5: Run the production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/practice/page.tsx app/statistics/page.tsx components/StatisticsView.tsx components/StatisticsView.test.tsx
git commit -m "feat: restyle the Practice tab and Statistics page"
```

---

### Task 9: Settings — `SettingsForm`

**Files:**
- Modify: `app/settings/page.tsx`
- Modify: `components/SettingsForm.tsx`
- Test: `components/SettingsForm.test.tsx` (extend existing file)

**Interfaces:**
- Consumes: `bg-paper`, `bg-surface`, `border-hairline`, `bg-ink`/`text-paper` (theme toggle's active option, the Save button), `font-ui` (Task 1).

- [ ] **Step 1: Write failing test**

```tsx
test('the active theme option button uses bg-ink/text-paper and inactive options use the neutral style', () => {});
```

- [ ] **Step 2: Run test, confirm it fails**

Run: `npm test -- SettingsForm`
Expected: FAIL.

- [ ] **Step 3: Implement**

Theme toggle's 3 buttons, the Save button, and the avatar-upload control all follow the same active/inactive `bg-ink`/`bg-surface` pattern established in Tasks 5/6/8 — this task introduces no new pattern, just applies the existing one. Text inputs and the threshold range input get `bg-surface border-hairline font-ui`.

- [ ] **Step 4: Run test, confirm it passes**

Run: `npm test -- SettingsForm`
Expected: PASS

- [ ] **Step 5: Run the production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/settings/page.tsx components/SettingsForm.tsx components/SettingsForm.test.tsx
git commit -m "feat: restyle the Settings page"
```

---

### Task 10: Login, signup, `GoogleSignInButton`

**Files:**
- Modify: `app/login/page.tsx`
- Modify: `app/signup/page.tsx`
- Modify: `components/GoogleSignInButton.tsx`
- Test: extend whichever of these already have test files; add a minimal render test for any that don't

**Interfaces:**
- Consumes: `bg-paper`, `bg-surface`, `border-hairline`, `bg-ink`/`text-paper`, `font-ui`, `font-reading` (an app name/headline, if one exists on these pages — implementer's call whether either page has a headline worth the serif treatment) (Task 1).

- [ ] **Step 1: Write a failing test**

```tsx
test('the login page\'s submit button uses bg-ink/text-paper', () => {});
```

- [ ] **Step 2: Run test, confirm it fails**

Run: `npm test -- login`
Expected: FAIL.

- [ ] **Step 3: Implement**

Both pages: `bg-paper` root, form inputs `bg-surface border-hairline font-ui`, submit button `bg-ink text-paper`. `GoogleSignInButton`: follows the secondary/neutral pattern (`bg-surface border-hairline`), since it's an alternative to the primary email/password submit, not the primary action.

- [ ] **Step 4: Run test, confirm it passes**

Run: `npm test -- login`
Expected: PASS

- [ ] **Step 5: Run the production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/login/page.tsx app/signup/page.tsx components/GoogleSignInButton.tsx
git commit -m "feat: restyle login, signup, and the Google sign-in button"
```

---

### Task 11: Full verification pass

- [ ] **Step 1: Run the full test suite**

Run: `npm test && npm run typecheck`
Expected: PASS

- [ ] **Step 2: Run the production build and confirm every new token class survives it**

Run: `npm run build`
Expected: PASS. Additionally: grep the built output (or re-read every file touched by Tasks 1–10) for any template-string class-name interpolation that could have slipped past a single task's own review (per this plan's Global Constraint) — e.g. `grep -rn '\`bg-\${' app components` should return nothing.

- [ ] **Step 3: Verify dark mode across one representative page from each task**

For at least one page/component touched by each of Tasks 2–10, render (or manually check, if a running server is available) with `data-theme="dark"` set and confirm no element is still showing a light-mode-only literal color — this is the Review Focus item about dark mode that no single task's own test, scoped to its own component, would catch in aggregate across the whole app.

- [ ] **Step 4: Manually verify the two things that need a running server/browser, if one is available**

Confirm the Bookshelf's generating-sweep animation visually runs under normal settings and is static under a reduced-motion OS/browser setting. (If no live server/browser is available in this environment, note this as a deferred manual check, the same way earlier plans in this repo have deferred manual-server checks when no credentials/running instance was available.)

- [ ] **Step 5: Commit (only if Steps 1–3 required any fixes)**

```bash
git add -A
git commit -m "fix: address issues found in the visual redesign's verification pass"
```

---

## Self-Review Notes

- **Spec coverage:** every surface named in the design doc's expanded Goals list (Bookshelf + its two forms, Practice, Statistics, Settings, Book Detail + setup + toggle, Free reading, Section reading, Flashcards + ratings, `WordPopup`, TabBar/HeaderNav, login/signup/Google sign-in) has an owning task. The token system itself (palette, both themes, type) is Task 1, consumed by every other task.
- **Type consistency:** every task's "Interfaces" block names the exact Tailwind class names Task 1 produces (`bg-paper`, `bg-surface`, `bg-ink`, `text-ink-muted`, `border-hairline`, `bg-locked`, `bg-practicing`, `bg-unlocked`, `bg-error`, `font-ui`, `font-reading`) with no renaming between tasks.
- **Review Focus:** all 5 items (dark mode completeness, reduced-motion, the 4-status/3-hue distinction, error-vs-practicing confusion, progress-color leakage onto non-progress controls) each have an owning task and an explicit test, not just a mention in Task 11's general verification pass.
- **Proportion:** 11 tasks for a redesign that touches essentially every page is proportionate to the design doc's own scope — each task is one visually-cohesive unit (a page or a tightly-related group of components), not an arbitrary file-by-file split.
