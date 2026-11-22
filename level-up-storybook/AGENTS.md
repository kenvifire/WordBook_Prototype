<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Reusable UI lives in `src/components/wb/` and uses tokens from `src/styles.css`; why: one design system, no hard-coded colors.
- All UI copy lives in `src/content/copy.ts`; why: easy review of simple-English text.
- Mock data and types live in `src/mock/`; real data comes from Cloud tables through `src/data/*`; why: the backend exists now.
- Learner pages sit under the pathless `_learner` layout (top bar + mobile tabs); admin pages under `admin` (sidebar).
- Never name a route file with a `.stories.` segment (the bundler drops it); use a folder like `routes/admin/stories.tsx`.
- Screens read content through `src/data/*` (Cloud tables via the browser client, RLS applies), never `src/mock/` directly; why: one swap point from mock to real data.
- Route protection uses `ssr: false` + `beforeLoad` guards from `src/lib/guards.ts` (sign-in, consent, staff via the `checkStaff` server function); why: session lives in the browser and admin checks must run on the server.
- Flashcard study UI is one shared component (`src/components/wb/flashcard-session.tsx`) used by prepare and review; why: one implementation of ratings, requeue and translation switch.
- Own books (learner uploads PDF/EPUB/TXT): the file is parsed in the browser (`src/lib/own-books/parse-file.ts`); the server receives only text. All writes go through `src/lib/own-books.functions.ts` (admin client, owner checked in code); learners have read-only rules on their own rows (`stories.owner_id`). Own books use genre `mine` and version status `auto`, never `approved`; why: private to the uploader and never shown to other learners.
- AI word cards for own books live in `src/lib/own-books/ai.server.ts` (Lovable AI, model in `src/config/learning.ts`) and are checked by `parseCardsResponse` before saving; why: the quiz needs unique, valid words that are in the text.
- Placement test runs in server functions (`src/lib/placement.functions.ts`); the item bank with the answer key is `src/lib/placement/bank.server.ts` and must only be imported inside server handlers. Scoring rules live in `src/lib/placement/scoring.ts` (pure, tested); why: answers never reach the browser and the rules are easy to calibrate. n8n is not used.
- Reading levels are A2, B1, B2, C1 (`LEVELS` in `src/config/learning.ts`). When a team story has no approved version at the learner's level, screens show the closest approved level (`closestApprovedVersion` / `visibleVersion`); why: adding a level must never empty the library.
- Level versions of team stories are made by AI from the closest approved level (`src/lib/levels.functions.ts`, one server call per part) and saved as `draft`; a reviewer approves them on `/admin/review/:versionId`. Only one approved version per story and level; why: learners only read reviewed text.
