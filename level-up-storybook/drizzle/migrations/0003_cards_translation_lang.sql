ALTER TABLE public.cards ADD COLUMN translation_lang text;
COMMENT ON COLUMN public.cards.translation_lang IS 'Language of cards.translation, matches learners.first_language (e.g. Spanish)';