ALTER TABLE public.app_settings ADD COLUMN learner_visible boolean NOT NULL DEFAULT false;
UPDATE public.app_settings SET learner_visible = true WHERE key = 'gate_threshold';
DROP POLICY "signed-in read" ON public.app_settings;
CREATE POLICY "read visible or staff" ON public.app_settings FOR SELECT TO authenticated USING (learner_visible OR public.is_staff(auth.uid()));