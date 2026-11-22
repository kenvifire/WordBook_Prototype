import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SimpleShell } from "@/components/wb/simple-shell";
import { PageHeader } from "@/components/wb/page-header";
import { Card } from "@/components/wb/card";
import { Button } from "@/components/wb/button";
import { copy } from "@/content/copy";
import { seo } from "@/lib/seo";
import { requireUser } from "@/lib/guards";
import { learnerQuery, saveConsent } from "@/data/learner";
import { LoadingState } from "@/components/wb/query-states";

export const Route = createFileRoute("/consent")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    await requireUser();
    const learner = await context.queryClient.ensureQueryData(learnerQuery());
    if (learner?.consent_at) throw redirect({ to: "/library" });
  },
  pendingComponent: LoadingState,
  head: () => seo("Before we start", "How WordBook uses your data."),
  component: Consent,
});

function Consent() {
  const c = copy.consent;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [data, setData] = useState(false);
  const [adult, setAdult] = useState(false);
  const [lang, setLang] = useState("");
  const [goal, setGoal] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = data && adult && lang !== "" && goal.trim() !== "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setSaving(true); setError(null);
    try {
      await saveConsent({ firstLanguage: lang, goal: goal.trim() });
      qc.removeQueries({ queryKey: ["learner"] });
      navigate({ to: "/placement" });
    } catch {
      setError(c.error); setSaving(false);
    }
  }

  return (
    <SimpleShell>
      <PageHeader title={c.title} description={c.desc} />
      <Card><ul className="list-disc space-y-2 pl-5 text-lg">{c.points.map((p) => <li key={p}>{p}</li>)}</ul></Card>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Card className="space-y-4">
          <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="h-5 w-5" checked={data} onChange={(e) => setData(e.target.checked)} />{c.data}</label>
          <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="h-5 w-5" checked={adult} onChange={(e) => setAdult(e.target.checked)} />{c.age}</label>
          <label className="block font-semibold">{c.language}
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border-2 border-ink bg-background px-3">
              <option value="">{c.languagePick}</option>
              {c.languages.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <label className="block font-semibold">{c.goal}
            <input type="text" maxLength={140} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder={c.goalHint} className="mt-1 block min-h-11 w-full rounded-xl border-2 border-ink bg-background px-3" />
          </label>
        </Card>
        {error && <p role="alert" className="rounded-xl border-2 border-ink bg-mint p-3 font-semibold">{error}</p>}
        <Button type="submit" disabled={!ready || saving}>{saving ? c.saving : c.button}</Button>
      </form>
    </SimpleShell>
  );
}
