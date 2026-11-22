# Word preparation: flashcards with spaced repetition

## What the learner sees (/story/:id/prepare/:sectionId)
- **Gate turned off for this learner and part:** no cards. The part opens and the learner goes straight to reading.
- **Normal case:** one card at a time, using all 20 words of the part.
  - Front: the word and an example sentence. Tap to turn the card over.
  - Back: the meaning, plus a "Show translation" switch when a translation exists. The switch is off by default.
- **Three large buttons:** "Don't know yet", "Almost", "I know it".
  - "I know it" removes the card from this session.
  - "Don't know yet" brings the card back after 3 other cards.
  - "Almost" brings it back after 6.
- **Progress:** "X of N words learned in this session".
- **When all cards are done:** a "Take the word quiz" button. The quiz page stays as it is for now.
- Loading, empty ("No words for this part yet") and error states. Built mobile-first, with buttons at least 44px.

## Settings in one place
`src/config/learning.ts` holds every number: gate threshold 0.8, threshold options, review gaps of 0/1/3/7/14 days, bring-back gaps of 3 and 6 cards, and 3 failed tries before an override. No numbers appear anywhere else.

## Database changes (SQL shown below; please confirm)
```sql
-- Word progress per learner
CREATE TABLE public.card_progress (
  learner_id uuid NOT NULL DEFAULT auth.uid(),
  card_id text NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  box int NOT NULL DEFAULT 0,
  due timestamptz,
  lapses int NOT NULL DEFAULT 0,
  last_rating text CHECK (last_rating IN ('dont_know','almost','know')),
  mastered_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (learner_id, card_id)
);
GRANT SELECT, INSERT, UPDATE ON public.card_progress TO authenticated;
GRANT ALL ON public.card_progress TO service_role;
ALTER TABLE public.card_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own progress read"   ON public.card_progress FOR SELECT TO authenticated USING (learner_id = auth.uid());
CREATE POLICY "own progress insert" ON public.card_progress FOR INSERT TO authenticated WITH CHECK (learner_id = auth.uid());
CREATE POLICY "own progress update" ON public.card_progress FOR UPDATE TO authenticated USING (learner_id = auth.uid()) WITH CHECK (learner_id = auth.uid());

-- Gate on/off per learner and part (no row = gate on)
CREATE TABLE public.gate_assignments (
  learner_id uuid NOT NULL,
  section_id text NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  gate_enabled boolean NOT NULL DEFAULT true,
  PRIMARY KEY (learner_id, section_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gate_assignments TO authenticated;
GRANT ALL ON public.gate_assignments TO service_role;
ALTER TABLE public.gate_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin read" ON public.gate_assignments FOR SELECT TO authenticated USING (learner_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin insert" ON public.gate_assignments FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update" ON public.gate_assignments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete" ON public.gate_assignments FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- App settings
CREATE TABLE public.app_settings (key text PRIMARY KEY, value jsonb NOT NULL);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signed-in read" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin insert" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update" ON public.app_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete" ON public.app_settings FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- One row per attempt (existing columns kept)
ALTER TABLE public.section_attempts
  ADD COLUMN attempt_no int,
  ADD COLUMN passed boolean,
  ADD COLUMN threshold numeric,
  ADD COLUMN missed_card_ids jsonb,
  ADD COLUMN duration_seconds int,
  ADD COLUMN override boolean NOT NULL DEFAULT false;
```
I'll add this setting as a separate data step, not a database change: `gate_threshold = 0.8`.

**Words:** already done. I checked, and all 18 parts (3 stories × 2 levels × 3 parts) have exactly 20 words each, 360 in total. Nothing to add.

## Saved activity
- **Every rating saves word progress:**
  - "I know it" moves the word up one box, and it comes back for review after 0/1/3/7/14 days.
  - "Almost" keeps the same box.
  - "Don't know yet" puts it back in box 0 and counts one more miss.
- **Events:**
  - `prepare_started`.
  - `card_rated`, with the word, the rating and the answer time.
  - `gate_skipped_by_design`, when the gate is off.

## Two points that need your OK
1. **Translations:** no word has a translation yet, and the translation field does not say which language it is in. As it is, the "Show translation" switch will never appear. My suggestion: add a `translation_lang` field to the words, and show the translation only when it matches the learner's first language. I can also add Spanish translations later. I won't add this field unless you say yes.
2. **Old review table:** the existing "reviews" table, which already does spaced repetition, overlaps with `card_progress`. My suggestion: use `card_progress` for the current state of each word, and keep "reviews" untouched for now.

## Technical details
- `src/lib/srs.ts`: one pure function, `schedule(progress, rating, now)`, that returns the new box, due date, misses and last rating. A second pure function, `requeue(queue, card, rating)`, handles the session order. Both read only from `src/config/learning.ts`.
- `src/lib/srs.test.ts`:
  - "I know it" goes from box 0 to 1 with due = now + 1 day.
  - "Almost" keeps the box.
  - "Don't know yet" goes back to box 0 and adds one miss.
  - The box never goes past the last interval.
  - The bring-back positions are 3 and 6.
- **Data layer:**
  - New `src/data/prepare.ts` with:
    - gate assignment
    - an upsert of word progress
    - an unlock insert, with `passed` null and `override` false
  - Events go through `logEvent`.
  - `src/data/learner.ts` adds `first_language`.
  - `src/data/stories.ts` adds `translation` to the word data.
- **Prepare route:**
  - The loader reads the stories, the learner and the gate setting.
  - When the gate is off, the page saves the unlock and the event, then redirects to `/read/:sectionId`.
  - All text goes in `copy.ts`.
- The quiz is not built and nothing else is created.
