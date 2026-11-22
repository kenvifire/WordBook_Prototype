# Own books + Google sign-in — Lovable setup

Code for own books (upload PDF / EPUB / TXT, AI word cards) was written outside Lovable, on the branch
`feature/own-books-google`. Lovable syncs the code, but backend changes (database, AI, sign-in methods)
must be done from the Lovable chat. Paste these prompts **one at a time, in this order**, after the PR is merged to `main`.

## Prompt 1 — database (Build mode)

```
Apply the SQL in docs/lovable/0007_own_books.sql as a new database migration, exactly as written.
It adds stories.owner_id and read-only access rules so a learner can read only the books they uploaded.
Do not add insert, update or delete rules for learners: uploaded books are written only by the server
functions in src/lib/own-books.functions.ts (admin client, owner checked in code).
After applying, regenerate src/integrations/supabase/types.ts. Do not change any other file.
```

## Prompt 2 — Lovable AI (Build mode)

```
Enable Lovable AI for this project so LOVABLE_API_KEY is available to server functions.
src/lib/own-books/ai.server.ts already calls Lovable AI with @tanstack/ai-lovable
(model set in OWN_BOOK_AI_MODEL in src/config/learning.ts, now "google/gemini-3.7-flash").
Do not rewrite that code. Only if this model is not available in this workspace, change
OWN_BOOK_AI_MODEL to the closest available fast Gemini chat model and tell me which one.
```

## Prompt 3 — Google sign-in (Build mode)

```
Add "Sign in with Google" using Google authentication Managed by Lovable. Keep the email magic link.
On /signin, show a "Continue with Google" button above the email form, using Button from
src/components/wb/button.tsx (variant secondary) and a new copy key signin.google in src/content/copy.ts.
After Google sign-in, use the same redirect as today: /consent if consent_at is empty, else /library.
The sign-up trigger (handle_new_user) must still create the learners row and the learner role.
Do not change other screens.
```

## Test checklist (on a phone and a computer)

- [ ] Two accounts: A uploads a book; B does not see it in the Library or by opening its URL.
- [ ] Library → "Add your book" → upload an EPUB (Project Gutenberg works), a text PDF and a TXT.
- [ ] A scanned PDF shows the "no text in this PDF" message.
- [ ] After upload, Part 1 has word cards; opening Part 2 shows "Making word cards…" and then the cards.
- [ ] Flashcards → quiz → read works the same as for team stories; tapped words join Review.
- [ ] Translations appear in the learner's first language (if it is in the consent list).
- [ ] "Remove this book" deletes it.
- [ ] Google sign-in works on the published URL; a new Google user goes to /consent.
- [ ] Logs (More → Logs) show no "[own-books]" errors.

## How it works (for the team)

- The file is read **on the learner's device** (pdf.js for PDF, JSZip for EPUB). The server gets only the text; no files are stored.
- Text is split into parts of about 400 words (paragraphs kept whole). Numbers live in `src/config/learning.ts`.
- Cards: up to 12 per part, made by AI for the learner's level (B1/B2), checked in code (word must be in the part,
  no duplicate words or meanings, single words only). Part 1 at upload; other parts the first time they are opened.
- Uploaded books get genre `mine`, version status `auto` (never `approved`), and `owner_id` = the learner.
- Events logged: `own_book_added`, `own_book_cards_made`, `own_book_deleted`, `own_book_upload_finished`.
