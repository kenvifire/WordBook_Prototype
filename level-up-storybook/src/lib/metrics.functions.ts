import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Count = { label: string; count: number };
const top = (m: Map<string, number>, n = 10): Count[] =>
  [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, n);

// Staff-only pilot metrics. Role is checked as the caller before using the admin client.
export const getMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: staff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (staff !== true) throw new Error("Not allowed.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: learners }, { data: users }, { data: reviews }, { data: lookups }, { data: opens }, { data: stories }, { data: cards }] = await Promise.all([
      supabaseAdmin.from("learners").select("id,created_at"),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
      supabaseAdmin.from("reviews").select("card_id,rating").lte("rating", 1),
      supabaseAdmin.from("lookups").select("lemma"),
      supabaseAdmin.from("events").select("entity").eq("type", "story_viewed"),
      supabaseAdmin.from("stories").select("id,title"),
      supabaseAdmin.from("cards").select("id,lemma"),
    ]);
    const byId = new Map((users?.users ?? []).map((u) => [u.id, u]));
    const learnerRows = (learners ?? []).map((l) => {
      const u = byId.get(l.id);
      const meta = (u?.user_metadata ?? {}) as Record<string, unknown>;
      return { id: l.id, email: u?.email ?? "", name: (meta["full_name"] ?? meta["name"] ?? null) as string | null, joined: l.created_at };
    });
    const lemma = new Map((cards ?? []).map((c) => [c.id, c.lemma]));
    const err = new Map<string, number>();
    for (const r of reviews ?? []) { const k = lemma.get(r.card_id) ?? r.card_id; err.set(k, (err.get(k) ?? 0) + 1); }
    const look = new Map<string, number>();
    for (const l of lookups ?? []) look.set(l.lemma, (look.get(l.lemma) ?? 0) + 1);
    const st = new Map<string, number>((stories ?? []).map((s) => [s.title, 0]));
    const title = new Map((stories ?? []).map((s) => [s.id, s.title]));
    for (const o of opens ?? []) { const t = title.get(o.entity ?? "") ?? o.entity ?? "?"; st.set(t, (st.get(t) ?? 0) + 1); }
    return { learners: learnerRows, errors: top(err), lookups: top(look), stories: top(st, 50) };
  });
