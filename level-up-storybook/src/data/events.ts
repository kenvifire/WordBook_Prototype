import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// learner_id and ts are filled in by the database.
export async function logEvent(type: string, entity: string | null, payload: Record<string, Json> = {}) {
  const { error } = await supabase.from("events").insert({ type, entity, payload });
  if (error) console.error("event not saved", type, error.message);
}
