# Remember the card language and the translation switch

## What changes for the learner
- On the back of a word card there is a small **Translation language** picker (Spanish, Portuguese, French, Chinese, Polish, Arabic, Other). It starts on the language chosen on the consent page.
- Changing it saves the new language to the learner's account, so it is still selected next time, on any device.
- The **Show translation** switch is remembered too. If a learner turns it on, it stays on for the next cards and the next visit, until they turn it off.
- If the picked language has no translation (Portuguese, French, Arabic, Other), the switch is hidden and a short line says "No translation in this language yet."

## Database change
```sql
ALTER TABLE public.learners ADD COLUMN show_translation boolean NOT NULL DEFAULT false;
```
Access stays the same: each learner can read and change only their own row.

## Code
- `src/data/learner.ts`: read `show_translation`; add `saveCardLanguage(lang)` and `saveShowTranslation(on)` that update the learner's own row and log events `card_language_changed` and `translation_toggled`.
- Prepare page: add the picker and use the saved switch value instead of resetting it on every card. Update the cached learner right away so the change shows at once.
- `src/content/copy.ts`: picker label and the "no translation yet" line.
- Test: switch value saved on means it starts on for the next card; a language without translations hides the switch.

## Not included
- No picker on the reading page.
- No new translation languages.
