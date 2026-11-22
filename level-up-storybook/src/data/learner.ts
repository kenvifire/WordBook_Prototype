import { DEFAULT_LEVEL, isLevel } from "@/config/learning";
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Level } from "@/mock/types";
import { mockLearner } from "@/mock/stories";

// Streak, counts and quiz threshold stay as test numbers until those features use real data.
export const learnerStats = mockLearner;

export type LearnerRow = { id: string; consent_at: string | null; placement_level: string | null; first_language: string | null; show_translation: boolean };

export async function fetchLearner(): Promise<LearnerRow | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase.from("learners").select("id,consent_at,placement_level,first_language,show_translation").eq("id", u.user.id).maybeSingle();
  if (error) throw new Error(error.message);
  return data as LearnerRow | null;
}
export const learnerQuery = () => queryOptions({ queryKey: ["learner"], queryFn: fetchLearner });
export const learnerLevel = (l: LearnerRow | null | undefined): Level => (isLevel(l?.placement_level) ? l.placement_level : DEFAULT_LEVEL);

export async function saveConsent(input: { firstLanguage: string; goal: string }) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("You are not signed in.");
  const consent_at = new Date().toISOString();
  const { error } = await supabase.from("learners").update({ consent_at, age_confirmed: true, first_language: input.firstLanguage, goal: input.goal } as never).eq("id", u.user.id);
  if (error) throw new Error(error.message);
  await supabase.from("events").insert({ type: "consent_given", entity: "learner", payload: { first_language: input.firstLanguage } } as never);
}

async function updateOwn(patch: Record<string, unknown>, event: string, payload: Record<string, unknown>) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("You are not signed in.");
  const { error } = await supabase.from("learners").update(patch as never).eq("id", u.user.id);
  if (error) throw new Error(error.message);
  await supabase.from("events").insert({ type: event, entity: "learner", payload } as never);
}
export const saveCardLanguage = (lang: string) => updateOwn({ first_language: lang }, "card_language_changed", { first_language: lang });
export const saveShowTranslation = (on: boolean) => updateOwn({ show_translation: on }, "translation_toggled", { on });
