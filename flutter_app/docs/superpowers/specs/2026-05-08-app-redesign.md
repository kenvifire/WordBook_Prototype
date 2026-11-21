# WordBook App Redesign — Navigation, Visual & Flow

## Context

The app has solid core functionality (multi-format reader, SRS vocabulary, multi-language extraction, cloud sync) but the UX is fragmented across 4 tabs. Users jump between tabs for a single workflow (read → practice → review). The visual design uses default Material 3 purple with sharp corners — functional but generic for a learning app.

## Goals

1. **Unify the workflow**: reading, vocabulary, and progress should live together per-book
2. **Create a daily habit hub**: make practice feel rewarding, not like a chore
3. **Distinctive visual identity**: forest green palette with soft rounded elements — growth, learning, calm

## Design Decisions

### Navigation: 4 tabs → 2 tabs + profile icon

| Tab | Content | Absorbed from old |
|---|---|---|
| **Library** | Bookshelf → Book Hub (Read/Words/Progress) | Books tab + Vocabulary tab (per-book) + Stats tab (per-book) |
| **Practice** | Streak card, due words per book, "Practice All", weekly chart, global stats | Vocabulary tab (cross-book) + Stats tab (global) |
| **Profile (icon)** | Settings, preferences, cloud sync, account | Settings tab |

### Book Hub: 3 inline tabs

Each book opens with tabs inside: **Read** | **Words** | **Progress**

- **Read**: cover gradient, language info, progress bar, "Continue Reading" (green primary button), "Section Reading" (outlined), "Free Read" (subtle)
- **Words**: all extracted words for this book, filter by status, edit/delete, extract button
- **Progress**: reading %, words learned, mastery rate, section completion status

### Practice Tab

- Streak card at top (gradient, day count, today's progress bar)
- Per-book due word list with quick "Practice" button per book
- "Practice All" button at bottom
- Weekly activity bar chart (M-S)
- Stats row: words learned, mastery rate, active books

### Visual Design: Forest Green + Rounded Soft

**Colors:**
- Primary: `#2E7D32` (dark green)
- On-primary: `#FFFFFF`
- Primary container: `#A5D6A7` (light green)
- Secondary: `#1B5E20` (deeper green)
- Surface: dark green-tinted backgrounds
- Error: red, Success: green accent

**UI Elements:**
- All buttons: border-radius 16 (rounded pill style)
- Cards: border-radius 12 with subtle elevation
- Icon buttons: contained with subtle background fill, radius 12
- Progress bars: rounded (radius 3-4)
- Input fields: border-radius 12, filled style
- Material Symbols Rounded icon family (stroke weight 1.25)

**Dark mode base surface:** `#0d1a0e` (very dark green-tinted)
**Light mode base surface:** `#f5faf5` (very light green-tinted)

### What gets removed/merged

| Old | New |
|---|---|
| 4-tab bottom nav | 2-tab bottom nav + AppBar profile icon |
| Separate Vocabulary tab (language tabs → book list → practice) | Practice tab (direct due words) |
| Separate Statistics tab | Practice tab (global) + Book Progress tab (per-book) |
| Separate screens for Extract Vocabulary, Word List, Book Statistics | Inline tabs inside Book Hub |
| Bookmarks "Coming soon!" button in reader | Remove dead UI |
| Material sharp icons | Material Symbols Rounded |

### What stays the same

- Auth flow, bookshelf grid/list, book upload, language detection
- Section-based reading workflow (generate sections → practice → read)
- SRS algorithm, word extraction pipeline, translation/dictionary services
- Cloud sync, RevenueCat subscriptions, i18n
- All reader formats (PDF, TXT, EPUB)

### Implementation Phases

**Phase 1: Navigation restructure**
- Replace 4-tab HomeScreen with 2-tab layout (Library, Practice)
- Move Settings to profile icon in AppBar
- Create BookHubScreen with TabBar (Read | Words | Progress)
- Wire existing screens into the new navigation

**Phase 2: Practice tab**
- Build PracticeScreen with streak card, due word lists, weekly chart
- Wire per-book practice buttons to existing WordPracticeScreen
- Add "Practice All" flow

**Phase 3: Visual overhaul**
- Replace theme colors with Forest Green palette
- Update all border-radius values (buttons: 16, cards: 12)
- Switch to Material Symbols Rounded icons
- Apply consistent rounded style across all screens

**Phase 4: Book Hub content**
- Move word list into Book Hub Words tab
- Move book statistics into Book Hub Progress tab
- Remove dead UI (bookmarks "Coming soon" button)
