-- Own books: a learner uploads a PDF, EPUB or TXT. The book is private to that learner.
-- Writes happen only in server functions with the admin client (src/lib/own-books/service.server.ts),
-- so learners get SELECT rules only. Staff keep their existing read access.

ALTER TABLE public.stories ADD COLUMN owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX stories_owner_id_idx ON public.stories(owner_id);
COMMENT ON COLUMN public.stories.owner_id IS 'Set for books a learner uploaded. NULL for team stories.';

-- Security-definer helpers avoid policy recursion between stories and story_versions.
CREATE OR REPLACE FUNCTION public.owns_story(_story_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.stories WHERE id = _story_id AND owner_id = auth.uid()) $$;

CREATE OR REPLACE FUNCTION public.owns_version(_version_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.story_versions v JOIN public.stories s ON s.id = v.story_id
                     WHERE v.id = _version_id AND s.owner_id = auth.uid()) $$;

CREATE OR REPLACE FUNCTION public.owns_section(_section_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.sections x JOIN public.story_versions v ON v.id = x.version_id
                     JOIN public.stories s ON s.id = v.story_id
                     WHERE x.id = _section_id AND s.owner_id = auth.uid()) $$;

CREATE POLICY "read own books" ON public.stories FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "read own book versions" ON public.story_versions FOR SELECT TO authenticated USING (public.owns_story(story_id));
CREATE POLICY "read own book sections" ON public.sections FOR SELECT TO authenticated USING (public.owns_version(version_id));
CREATE POLICY "read own book cards" ON public.cards FOR SELECT TO authenticated USING (public.owns_section(section_id));
CREATE POLICY "read own book translations" ON public.card_translations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.cards c WHERE c.id = card_translations.card_id AND public.owns_section(c.section_id)));

-- Own books are never "approved", so other learners never see them through the existing rules.
-- Learners must not be able to set owner_id or approve their own book from the browser:
-- the existing insert/update rules on these tables stay staff-only.
