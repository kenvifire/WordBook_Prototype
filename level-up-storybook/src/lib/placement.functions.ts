import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Placement test. The item bank and answer key stay on the server; the browser only gets the questions.
// Server modules are imported inside handlers so they never reach the browser bundle.

export type PlacementOutcome =
  | { ok: true; level: "A2" | "B1" | "B2" | "C1"; assigned_level: "A2" | "B1" | "B2" | "C1"; confidence: "high" | "medium" | "low" }
  | { ok: false; error: string };

export const getPlacementForm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const [{ WORDS, GRAMMAR, BANK_VERSION }, { buildForm }] = await Promise.all([import("@/lib/placement/bank.server"), import("@/lib/placement/scoring")]);
    return buildForm(WORDS, GRAMMAR, BANK_VERSION);
  });

export const submitPlacement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => d as { sheet: unknown; duration_seconds?: unknown })
  .handler(async ({ context, data }): Promise<PlacementOutcome> => {
    const [{ WORDS, GRAMMAR, BANK_VERSION }, { validate, score }, { supabaseAdmin }] = await Promise.all([
      import("@/lib/placement/bank.server"), import("@/lib/placement/scoring"), import("@/integrations/supabase/client.server"),
    ]);
    const checked = validate(data?.sheet, WORDS, GRAMMAR);
    if (!checked.ok) return { ok: false, error: checked.error };
    const r = score(checked.sub, WORDS, GRAMMAR);
    const duration = typeof data?.duration_seconds === "number" && data.duration_seconds >= 0 ? Math.min(Math.round(data.duration_seconds), 24 * 3600) : null;
    const userId = context.userId;

    const ins = await supabaseAdmin.from("placement_results").insert({
      learner_id: userId, bank_version: BANK_VERSION, self_band: checked.sub.self_band, level: r.level, assigned_level: r.assigned_level,
      range_flag: null, confidence: r.confidence === "high" ? 1 : r.confidence === "medium" ? 0.5 : 0, flags: r.flags,
      composite: r.composite, vocab_score: r.vocab.score, false_alarm_rate: r.vocab.false_alarm_rate, grammar_score: r.grammar.score,
      grammar_errors: r.grammar.errors, duration_seconds: duration, raw_result: { ...r, sheet: checked.sub },
    });
    if (ins.error) { console.error("[placement] result not saved", ins.error.message); return { ok: false, error: "save_failed" }; }
    const upd = await supabaseAdmin.from("learners").update({ placement_level: r.assigned_level }).eq("id", userId);
    if (upd.error) { console.error("[placement] level not saved", upd.error.message); return { ok: false, error: "save_failed" }; }
    await supabaseAdmin.from("events").insert({ learner_id: userId, type: "placement_finished", entity: BANK_VERSION, payload: { level: r.level, assigned_level: r.assigned_level, confidence: r.confidence, flags: r.flags, duration_seconds: duration } });

    // The learner sees only the level and a friendly message; scores stay in the database for the team.
    return { ok: true, level: r.level, assigned_level: r.assigned_level, confidence: r.confidence };
  });
