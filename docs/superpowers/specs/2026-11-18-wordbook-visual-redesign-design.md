# WordBook Visual Redesign — Design Doc

## Intent and why

The user said the UI "looks really primitive" — a general feeling, not tied to one screen. This is a visual-only redesign: no new product features, no new user flows, no change to how any page fetches data. It replaces WordBook's current unstyled/default-Tailwind look with a deliberate visual identity grounded in what WordBook actually is: a reader studies vocabulary from a real book, one section at a time, gated by a recognition check.

## Goals

- Every existing page/surface gets the same deliberate visual language: Bookshelf, Practice (list + session), Statistics, Settings, Book Detail (setup screen + Free/Section toggle), Free reading, Section reading, the per-section practice page, Flashcards, `WordPopup`, the TabBar/HeaderNav shell, the Generate-a-book form, **the upload form (`AddBookForm`), and the login/signup pages (including `GoogleSignInButton`)**. (The last three were an enumeration gap in an earlier draft, not an intentional exclusion — leaving login/signup unstyled would make it the one jarring page a user sees first, and leaving `AddBookForm` bare while its neighbor `GenerateBookForm` on the same Bookshelf page gets restyled would look broken, not deliberate.)
- The existing light/dark theme toggle (Settings → `theme`, already wired to `data-theme` on `<html>` since Plan 2) gets real dark-mode tokens — today it's plumbing with no visual effect.
- Progress/state (locked → practicing → unlocked → mastered) is encoded in color consistently everywhere it appears, not just decorated.

## Non-goals / anti-goals

- **Not** adopting MUI, Material Web, or any Material component library. Decided in brainstorming: nearly every component in those libraries requires `'use client'`, which fights this app's Server-Component-first architecture (AGENTS.md's explicit convention, reaffirmed by Plan 5's "never convert a Server Component page to client-fetched" constraint). Tailwind (already the stack) styled to this design's own token system is the implementation approach.
- **Not** a product/feature change. No new pages, no new user-facing behavior, no change to any data model, route, or API contract. Pure presentation.
- **Not** a generic "Material Design" skin. The direction that emerged from brainstorming is a blend of editorial reading-minimalism (for the actual reading/flashcard surfaces, where the book's own text and the word being studied are the thing that matters) and structured, state-driven color (for Bookshelf/progress surfaces) — not Material's general-purpose component aesthetic.
- Would fail even if "technically applied": reskinning every page with the same identical rounded-card-plus-shadow treatment regardless of what the surface actually is (the generic "SaaS card kit" look) — that's the primitive-feeling sameness this redesign exists to fix, not reproduce under a new palette.

## Constraints

- Tailwind 3 (already in the stack) is the only new-dependency-free path; no new npm package for this work.
- Every page that is currently a Server Component (nearly all of them) stays one. Styling is pure CSS/Tailwind classes — it costs nothing in that context.
- The existing `theme: 'light'|'dark'|'system'` mechanism (`app/layout.tsx` setting `data-theme`, `tailwind.config.ts`'s `darkMode: ['class', '[data-theme="dark"]']`) is reused as-is — this redesign supplies the dark-mode token *values*, not a new mechanism.
- Google Fonts is an allowed external resource (per this session's artifact conventions elsewhere, and already a common, lightweight choice for a Next.js app) — two font families, loaded via `next/font/google` for self-hosting/no layout shift, not a runtime `@import`.

## Decided: the design (approved by the user via the visual companion mockup)

### Palette — light

| Token | Hex | Role |
|---|---|---|
| Paper | `#EFEBE4` | Page background |
| Surface | `#F7F4EE` | Cards, the Flashcard, popovers, input fields |
| Ink | `#1F2420` | Primary text |
| Ink-muted | `#5B6058` | Secondary text, labels |
| Hairline | `#D9D3C6` | Borders — used instead of drop shadows for separation |
| Locked | `#9A948A` | A section/word not yet reachable |
| Practicing | `#B08A4E` | A section's words being studied; the "Again" flashcard action; a tapped word's underline |
| Unlocked / mastered | `#3F6652` | A section that's cleared the recognition gate; the "Hard"/"Good"/"Easy" flashcard actions; a fully-filled Bookshelf spine segment |
| Error | `#A8503D` | Generation-failed states, lookup errors, form validation — never used for progress |

### Palette — dark (new; closes the existing dead theme toggle)

| Token | Hex | Role |
|---|---|---|
| Paper | `#1A1D19` | Page background |
| Surface | `#23271F` | Cards, Flashcard, popovers |
| Ink | `#EDEAE2` | Primary text |
| Ink-muted | `#A6A99E` | Secondary text |
| Hairline | `#383C32` | Borders |
| Locked | `#6E6A60` | — |
| Practicing | `#D1A660` | Brightened slightly for dark-background contrast |
| Unlocked / mastered | `#5C8C73` | Brightened slightly for dark-background contrast |
| Error | `#C97A64` | Brightened slightly for dark-background contrast |

### Type

- **Figtree** (sans, weights 500/600/700) — all UI chrome: nav, buttons, labels, headings, form fields, the Bookshelf's book titles.
- **Source Serif 4** (serif, weights 400/600, optical-size variable) — all reading content: section/Free-reading body text, a Flashcard's word and definition, `WordPopup`'s definition text.
- Reading body text: 17–18px, line-height 1.65, max content width ~65ch (never full-bleed). Never justified; left-aligned.
- UI body/label text: 13–15px sans, normal case (no ALL-CAPS labels anywhere).

### The state-color language (the one through-line across every page)

`locked` / `practicing` / `unlocked`/`mastered` / `error` map to the same colors everywhere that concept appears:
- A Bookshelf book's progress, shown as a **filled spine** (a row of small vertical segments, filled left-to-right as sections unlock) — not a numeric "N of M" badge or a generic progress bar.
- A section's status badge: `locked` → Locked, `ready_to_practice` → Practicing, `ready_to_read` → Unlocked/mastered, `completed` → **also** Unlocked/mastered, with a small checkmark glyph distinguishing it from `ready_to_read` — not a fourth hue. (My call: the current badge uses 4 distinct colors for these 4 statuses; collapsing `ready_to_read`/`completed` to one hue-plus-icon keeps the palette at 3 progress colors while still telling the two apart.)
- `RatingButtons`' four SM-2 actions (again/hard/good/easy, unchanged — this redesign does not touch the rating logic AGENTS.md protects): **"Again" takes the practicing/ochre tone; "Hard"/"Good"/"Easy" all take the unlocked/moss tone**, distinguished from each other by label text only, not by three shades of green. (My call: in SM-2 terms, "again" is the only outcome meaning "didn't recognize it" — the other three all mean "recognized it," varying only in confidence, so the two-color split tracks the real recognize/didn't-recognize distinction the gate actually cares about, without inventing shades the token table doesn't license.)
- A tapped word in the reader gets a practicing-ochre underline while its popover is open (not a background highlight box).
- Any error/validation state (a failed generation, a lookup failure, a form validation message) uses the Error token — never one of the three progress colors, so "something went wrong" is never visually confusable with "still locked."
- Any other primary action or selected state that isn't about progress (a submit button, a selected chip, the Free/Section toggle) uses **Ink** (solid fill, Paper-colored label) for the active/primary state and **Surface + Hairline border** for the inactive/secondary state — reusing existing neutral tokens rather than borrowing a progress color. (My call: extends the doc's own "the three state colors are reserved for progress, not spent on navigation chrome" principle to every non-progress control in the app — the language-filter chips, the difficulty chips, "Generate book," the sectioning-method buttons, "Show definition," and the Free/Section toggle all follow this rule.)

### Per-surface treatment

- **Reading surfaces (Free reading, Section reading)**: no competing chrome. Generous margin, the serif body at reading width, minimal borders. These pages' job is to get out of the way of the book's own text.
- **Flashcard / practice session (including the per-section practice page, which today renders nothing but `PracticeSession`/`Flashcard` — there is no separate word-list view on that page; an earlier draft of this doc wrongly implied one)**: the one surface that earns a real elevated card, because at any moment there is exactly one of them on screen — a deliberate, justified card, not decoration. Centered, generous padding, the word in large serif.
- **Bookshelf**: a vertical list (not a grid of identical cards), each row showing title (Figtree), author (muted sans), language tag, and the spine-fill progress indicator. The "Not yet started" / "Generating…" / "Generation failed" states (from earlier plans) get the same Surface/hairline treatment, with the generating state additionally getting a subtle animated fill-sweep on the spine placeholder (the one deliberate, non-decorative motion moment in this redesign — it answers "is this actually happening," which a static placeholder can't).
- **Settings, Statistics, the Generate-a-book form**: standard form/UI chrome — Figtree, Surface-colored inputs, hairline borders, no cards-for-the-sake-of-cards.
- **TabBar / HeaderNav**: Surface background, Ink-muted inactive icons/labels, Ink (not an accent color) for the active tab — the three state colors are reserved for progress, not spent on navigation chrome.
- **`WordPopup`**: Surface background, hairline border, serif definition text, the existing "Add to my vocabulary" button in the unlocked/moss tone (it's a positive, "you're building vocabulary" action).

## What's left to the builder

- The exact Tailwind config changes (extending the theme's `colors`/`fontFamily` with the tokens above, for both the default and `dark:`-prefixed values) and the `next/font/google` setup for the two families.
- Exact spacing/radius scale (the mockup used ~3–6px radii and generous padding; pick a consistent scale and apply it, rather than new one-off values per component).
- Responsive behavior at phone width for every page (the mockup was desktop-only; this needs real mobile verification, same as every other UI task in this codebase per CLAUDE.md conventions).
- Focus states, hover states, and reduced-motion handling for the one animated moment (the Bookshelf's generating-spine sweep) — must respect `prefers-reduced-motion`.
- Icon choices, if any are introduced beyond the existing Unicode-glyph gear icon (Plan 2 already established that no icon library exists in this repo — keep that convention unless a real need arises).
- Whether `components/SectionStatusBadge.tsx` (existing component) gets restyled in place or replaced — implementer's call, given its current prop shape should carry over unchanged.
