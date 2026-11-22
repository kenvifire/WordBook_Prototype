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
INSERT INTO public.card_translations (card_id, lang, text)
  SELECT id, translation_lang, translation FROM public.cards WHERE translation IS NOT NULL AND translation_lang IS NOT NULL;
COMMENT ON COLUMN public.cards.translation IS 'DEPRECATED: replaced by card_translations';
COMMENT ON COLUMN public.cards.translation_lang IS 'DEPRECATED: replaced by card_translations';