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

CREATE TABLE public.app_settings (key text PRIMARY KEY, value jsonb NOT NULL);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signed-in read" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin insert" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin update" ON public.app_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete" ON public.app_settings FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.section_attempts
  ADD COLUMN attempt_no int,
  ADD COLUMN passed boolean,
  ADD COLUMN threshold numeric,
  ADD COLUMN missed_card_ids jsonb,
  ADD COLUMN duration_seconds int,
  ADD COLUMN override boolean NOT NULL DEFAULT false;