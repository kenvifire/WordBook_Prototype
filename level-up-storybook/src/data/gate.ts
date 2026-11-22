import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GATE_THRESHOLD_DEFAULT } from "@/config/learning";

async function fetchThreshold(): Promise<number> {
  const { data, error } = await supabase.from("app_settings").select("value").eq("key", "gate_threshold").maybeSingle();
  if (error) return GATE_THRESHOLD_DEFAULT;
  const v = Number(data?.value);
  return Number.isFinite(v) && v > 0 && v <= 1 ? v : GATE_THRESHOLD_DEFAULT;
}
export const thresholdQuery = () => queryOptions({ queryKey: ["gate-threshold"], queryFn: fetchThreshold });

export type AttemptStats = { lastAttemptNo: number; failed: number };
async function fetchAttempts(sectionId: string): Promise<AttemptStats> {
  const { data, error } = await supabase.from("section_attempts").select("attempt_no,passed").eq("section_id", sectionId);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  return { lastAttemptNo: Math.max(0, ...rows.map((r) => r.attempt_no ?? 0)), failed: rows.filter((r) => r.passed === false).length };
}
export const attemptsQuery = (sectionId: string) => queryOptions({ queryKey: ["attempts", sectionId], queryFn: () => fetchAttempts(sectionId) });

export type AttemptInput = { sectionId: string; attemptNo: number; rate: number; passed: boolean; threshold: number; missed: string[]; durationSeconds: number };
export async function saveAttempt(a: AttemptInput) {
  const { error } = await supabase.from("section_attempts").insert({
    section_id: a.sectionId, attempt_no: a.attemptNo, recognition_rate: a.rate, passed: a.passed, threshold: a.threshold,
    missed_card_ids: a.missed, duration_seconds: a.durationSeconds, unlocked_at: a.passed ? new Date().toISOString() : null, override: false,
  });
  if (error) throw new Error(error.message);
}

export async function overrideUnlock(sectionId: string, attemptNo: number, threshold: number) {
  const { error } = await supabase.from("section_attempts").insert({
    section_id: sectionId, attempt_no: attemptNo, recognition_rate: 0, passed: null, threshold, missed_card_ids: [],
    unlocked_at: new Date().toISOString(), override: true,
  });
  if (error) throw new Error(error.message);
}

// Sets mastered_at for these cards only where it is not set yet.
export async function markMastered(cardIds: string[]) {
  if (cardIds.length === 0) return;
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("You are not signed in.");
  const now = new Date().toISOString();
  const { data: rows, error } = await supabase.from("card_progress").select("card_id,mastered_at").eq("learner_id", u.user.id).in("card_id", cardIds);
  if (error) throw new Error(error.message);
  const existing = new Map((rows ?? []).map((r) => [r.card_id, r.mastered_at]));
  const missing = cardIds.filter((id) => !existing.has(id));
  const toUpdate = cardIds.filter((id) => existing.has(id) && !existing.get(id));
  if (missing.length) {
    const { error: e } = await supabase.from("card_progress").insert(missing.map((card_id) => ({ learner_id: u.user!.id, card_id, mastered_at: now, updated_at: now })));
    if (e) throw new Error(e.message);
  }
  if (toUpdate.length) {
    const { error: e } = await supabase.from("card_progress").update({ mastered_at: now, updated_at: now }).eq("learner_id", u.user.id).in("card_id", toUpdate).is("mastered_at", null);
    if (e) throw new Error(e.message);
  }
}
