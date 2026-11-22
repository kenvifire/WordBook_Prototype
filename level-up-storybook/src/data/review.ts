import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STREAK_EVENT_TYPES } from "@/config/learning";
import { streak, type Due } from "@/lib/review";

export type ProgressRow = Due & { mastered_at: string | null };

async function fetchCardProgress(): Promise<ProgressRow[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await supabase.from("card_progress").select("card_id,due,origin,mastered_at").eq("learner_id", u.user.id);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ card_id: r.card_id, due: r.due ?? new Date(0).toISOString(), origin: r.origin === "tap" ? "tap" : "story", mastered_at: r.mastered_at }));
}
export const cardProgressQuery = () => queryOptions({ queryKey: ["card-progress"], queryFn: fetchCardProgress });

export type Activity = { streakDays: number; completedSections: string[] };
async function fetchActivity(): Promise<Activity> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { streakDays: 0, completedSections: [] };
  const since = new Date(Date.now() - 400 * 86400000).toISOString();
  const { data, error } = await supabase.from("events").select("type,entity,ts").eq("learner_id", u.user.id).in("type", [...STREAK_EVENT_TYPES]).gte("ts", since).order("ts", { ascending: false }).limit(5000);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  return {
    streakDays: streak(rows.map((r) => r.ts), new Date()),
    completedSections: [...new Set(rows.filter((r) => r.type === "section_completed" && r.entity).map((r) => r.entity!))],
  };
}
export const activityQuery = () => queryOptions({ queryKey: ["activity"], queryFn: fetchActivity });
