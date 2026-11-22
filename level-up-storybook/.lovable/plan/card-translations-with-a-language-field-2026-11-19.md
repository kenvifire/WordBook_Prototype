# Card translations with a language field

## What changes for the learner
- On the back of a card, learners whose first language is Spanish see a "Show translation" switch. It is off by default.
- Learners with another first language (Portuguese, French, Chinese, Arabic, Other) see no switch, because there is no translation in their language yet.

## Database change
```sql
ALTER TABLE public.cards ADD COLUMN translation_lang text;
COMMENT ON COLUMN public.cards.translation_lang IS 'Language of cards.translation, matches learners.first_language (e.g. Spanish)';
```
The existing access rules for cards stay the same: learners read cards only from approved versions, and only staff can change them.

## Spanish translations (a data step)
- I write a short Spanish translation for every word in the 3 stories. That is about 180 different words, used at both levels, so 360 cards in total.
- Each translation fits the meaning the word has in that story. For example, "watch" is "reloj de bolsillo" and "safe" is "caja fuerte".
- Every card gets `translation_lang = 'Spanish'`.
- The translations are written by me, not checked by a native speaker. A reviewer should check them before the pilot.

## Code
- `src/data/stories.ts`: read `translation_lang` with each card.
- Prepare page: show the switch only when the card has a translation and `translation_lang` matches the learner's first language. The language names are the same as in the consent page list.
- Add a small test for the matching rule: Spanish matches Spanish; French does not match Spanish; no translation means no switch.

## Not included
- No other languages.
- No admin screen for editing translations.
