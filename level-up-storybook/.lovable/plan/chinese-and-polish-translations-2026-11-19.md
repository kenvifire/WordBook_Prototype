# Chinese and Polish translations

## What changes for the learner
- The first-language list on the consent page gets **Polish**. Chinese is already on the list. The new order is Spanish, Portuguese, French, Chinese, Polish, Arabic, Other.
- Learners whose first language is Spanish, Chinese or Polish see a "Show translation" switch on the back of each word card. It is off by default.

## Why the database needs a change
Each card can hold only one translation now, so it cannot keep Spanish, Chinese and Polish at the same time. I'll add a small translations list with one row per card and per language. The Spanish translations move into this list.

```sql
CREATE TABLE public.card_translations (
  card_id text NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  lang text NOT NULL,
  text text NOT NULL,
  PRIMARY KEY (card_id, lang)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_translations TO authenticated;
GRANT ALL ON public.card_translations TO service_role;
ALTER TABLE public.card_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read approved translations" ON public.card_translations FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR EXISTS (SELECT 1 FROM public.cards c JOIN public.sections s ON s.id = c.section_id
         WHERE c.id = card_translations.card_id AND public.version_approved(s.version_id)));
CREATE POLICY "staff insert" ON public.card_translations FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "staff update" ON public.card_translations FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff delete" ON public.card_translations FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

-- Move the existing Spanish translations in
INSERT INTO public.card_translations (card_id, lang, text)
  SELECT id, translation_lang, translation FROM public.cards WHERE translation IS NOT NULL AND translation_lang IS NOT NULL;
COMMENT ON COLUMN public.cards.translation IS 'DEPRECATED: replaced by card_translations';
COMMENT ON COLUMN public.cards.translation_lang IS 'DEPRECATED: replaced by card_translations';
```
Who can see and change translations is the same as for the cards: learners read only approved stories, and only staff can make changes. The old fields stay in place but are no longer used.

## Translations (a data step)
- I write Chinese (simplified) and Polish translations for all 180 different words. Each translation fits the meaning in the story. For example, "watch" is 怀表 and "zegarek kieszonkowy".
- Each card at both levels gets its translation, so 360 cards × 2 new languages.
- These translations are written by me. A native speaker should check them before the pilot.

## Code
- `src/content/copy.ts`: add "Polish" to the language list.
- `src/data/stories.ts`: read each card's translations list. `translationFor(card, firstLanguage)` picks the one that matches the learner's language.
- Prepare page: no visible change. It keeps using `translationFor`.
- Tests: update the matching test. Spanish, Chinese and Polish each find their own translation. French finds none.

## Not included
- No translations for Portuguese, French or Arabic.
- No admin screen for editing translations.
