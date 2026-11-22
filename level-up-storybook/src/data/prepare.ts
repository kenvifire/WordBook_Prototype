import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { schedule, type Rating } from "@/lib/srs";

// No row means the gate is on.
async function fetchGateEnabled(sectionId: string): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return true;
  const { data, error } = await supabase.from("gate_assignments").select("gate_enabled").eq("learner_id", u.user.id).eq("section_id", sectionId).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.gate_enabled ?? true;
}
export const gateQuery = (sectionId: string) => queryOptions({ queryKey: ["gate", sectionId], queryFn: () => fetchGateEnabled(sectionId) });

export async function unlockWithoutGate(sectionId: string) {
  const { error } = await supabase.from("section_attempts").insert({ section_id: sectionId, recognition_rate: 0, unlocked_at: new Date().toISOString(), passed: null, override: false });
  if (error) throw new Error(error.message);
}

// keepMastered: review sessions never change mastered_at.
export async function saveRating(cardId: string, rating: Rating, opts: { keepMastered?: boolean | undefined } = {}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("You are not signed in.");
  const { data: prev, error: e1 } = await supabase.from("card_progress").select("box,lapses,mastered_at").eq("learner_id", u.user.id).eq("card_id", cardId).maybeSingle();
  if (e1) throw new Error(e1.message);
  const now = new Date();
  const next = schedule(prev, rating, now);
  const { error } = await supabase.from("card_progress").upsert({
    learner_id: u.user.id, card_id: cardId, box: next.box, lapses: next.lapses, due: next.due.toISOString(), last_rating: rating,
    mastered_at: opts.keepMastered ? (prev?.mastered_at ?? null) : next.mastered ? (prev?.mastered_at ?? now.toISOString()) : null, updated_at: now.toISOString(),
  });
  if (error) throw new Error(error.message);
}
