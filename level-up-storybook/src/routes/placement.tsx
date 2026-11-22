import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { SimpleShell } from "@/components/wb/simple-shell";
import { PageHeader } from "@/components/wb/page-header";
import { Card } from "@/components/wb/card";
import { Button } from "@/components/wb/button";
import { ProgressBar } from "@/components/wb/progress-bar";
import { LoadingState, ErrorState } from "@/components/wb/query-states";
import { copy } from "@/content/copy";
import { seo } from "@/lib/seo";
import { requireConsent } from "@/lib/guards";
import { learnerQuery } from "@/data/learner";
import { logEvent } from "@/data/events";
import { getPlacementForm, submitPlacement, type PlacementOutcome } from "@/lib/placement.functions";
import type { PlacementForm, SelfBand, Submission } from "@/lib/placement/scoring";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/placement")({
  ssr: false,
  beforeLoad: ({ context }) => requireConsent(context.queryClient),
  loader: ({ context }) => context.queryClient.ensureQueryData(learnerQuery()),
  pendingComponent: LoadingState, errorComponent: ErrorState,
  head: () => seo("Find your level", "A short test to find your English level."),
  component: Placement,
});

type Step = "intro" | "self" | "words" | "sentences" | "sending" | "result";
type Saved = { form: PlacementForm; self: SelfBand | null; vocab: Submission["vocab"]; grammar: Submission["grammar"]; startedAt: number };
const KEY = "wb:placement";
const load = (): Saved | null => { try { const r = sessionStorage.getItem(KEY); return r ? (JSON.parse(r) as Saved) : null; } catch { return null; } };
const store = (s: Saved | null) => { try { if (s) sessionStorage.setItem(KEY, JSON.stringify(s)); else sessionStorage.removeItem(KEY); } catch { /* storage not available */ } };

const choice = "min-h-14 w-full rounded-xl border-2 border-ink bg-card px-4 py-3 text-left font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Placement() {
  const c = copy.placement;
  const { data: learner } = useSuspenseQuery(learnerQuery());
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [saved, setSaved] = useState<Saved | null>(() => load());
  // Mirror of `saved` updated at once, so a fast double tap or key press cannot answer the same item twice.
  const savedRef = useRef<Saved | null>(saved);
  const [step, setStep] = useState<Step>(() => {
    const s = load();
    if (!s) return "intro";
    if (!s.self) return "self";
    if (s.vocab.length < s.form.vocab.length) return "words";
    if (s.grammar.length < s.form.grammar.length) return "sentences";
    return "sending"; // all answered but not sent (page was reloaded): offer Retry
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(() => (step === "sending" ? c.sendError : null));
  const [result, setResult] = useState<Extract<PlacementOutcome, { ok: true }> | null>(null);
  const sending = useRef(false);

  const update = useCallback((patch: Partial<Saved>) => {
    const prev = savedRef.current;
    if (!prev) return null;
    const next = { ...prev, ...patch };
    savedRef.current = next; store(next); setSaved(next);
    return next;
  }, []);

  async function begin() {
    setBusy(true); setError(null);
    try {
      const form = await getPlacementForm();
      const s: Saved = { form, self: null, vocab: [], grammar: [], startedAt: Date.now() };
      store(s); savedRef.current = s; setSaved(s); setStep("self");
      void logEvent("placement_started", form.version, {});
    } catch { setError(c.loadError); } finally { setBusy(false); }
  }

  async function send(s: Saved) {
    if (sending.current) return; // submit only once
    sending.current = true; setStep("sending"); setError(null);
    try {
      const res = await submitPlacement({ data: { sheet: { self_band: s.self, vocab: s.vocab, grammar: s.grammar }, duration_seconds: (Date.now() - s.startedAt) / 1000 } });
      if (!res.ok) throw new Error(res.error);
      store(null); setResult(res); setStep("result");
      void qc.invalidateQueries({ queryKey: ["learner"] });
    } catch { setError(c.sendError); } finally { sending.current = false; }
  }

  // ---------- Screens ----------
  if (step === "intro") return (
    <SimpleShell>
      <PageHeader title={c.title} description={c.desc} />
      {learner?.placement_level && (
        <Card className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold">{c.previous(learner.placement_level)}</p>
          <Button asChild variant="secondary"><Link to="/library">{c.skip}</Link></Button>
        </Card>
      )}
      {error && <p role="alert" className="mb-4 rounded-xl border-2 border-ink bg-mint p-3 font-semibold">{error}</p>}
      <Button className="min-h-12" disabled={busy} onClick={() => void begin()}>{busy ? c.loading : learner?.placement_level ? c.again : c.start}</Button>
    </SimpleShell>
  );

  if (step === "result" && result) {
    const msg = result.confidence === "low" ? c.msgLow : c.msgSure;
    return (
      <SimpleShell>
        <PageHeader title={c.resultTitle} />
        <Card className="grain bg-mint text-center">
          <p className="sr-only">{c.resultLevel(result.assigned_level)}</p>
          <p aria-hidden className="unlock-pop relative z-10 font-display text-7xl font-extrabold">{result.assigned_level}</p>
          <p className="relative z-10 mt-4 text-lg">{msg}</p>
          <Button className="relative z-10 mt-6 min-h-12" onClick={() => navigate({ to: "/match" })}>{c.choose}</Button>
        </Card>
      </SimpleShell>
    );
  }

  if (!saved) return <SimpleShell><Button onClick={() => { store(null); setStep("intro"); }}>{c.retry}</Button></SimpleShell>;

  if (step === "self") return (
    <SimpleShell>
      <PageHeader title={c.selfTitle} description={c.selfQuestion} />
      <div className="grid gap-3" role="group" aria-label={c.selfQuestion}>
        {c.self.map((o) => (
          <button key={o.value} type="button" className={choice} onClick={() => { update({ self: o.value as SelfBand }); setStep("words"); }}>{o.label}</button>
        ))}
      </div>
    </SimpleShell>
  );

  if (step === "words") return <Words saved={saved} onAnswer={(known) => {
    const cur = savedRef.current!;
    const item = cur.form.vocab[cur.vocab.length];
    if (!item) return;
    const next = update({ vocab: [...cur.vocab, { item_id: item.id, known }] })!;
    if (next.vocab.length >= next.form.vocab.length) setStep("sentences");
  }} />;

  if (step === "sentences") return <Sentences saved={saved} onAnswer={(answer) => {
    const cur = savedRef.current!;
    const item = cur.form.grammar[cur.grammar.length];
    if (!item) return;
    const next = update({ grammar: [...cur.grammar, { item_id: item.id, answer }] })!;
    if (next.grammar.length >= next.form.grammar.length) void send(next);
  }} />;

  // sending
  return (
    <SimpleShell>
      <Card className="text-center" role="status">
        {!error ? <p className="text-xl font-bold">{c.checking}</p> : (
          <>
            <p className="text-xl font-bold">{error}</p>
            <Button className="mt-4" onClick={() => void send(saved)}>{c.retry}</Button>
          </>
        )}
      </Card>
    </SimpleShell>
  );
}

function Words({ saved, onAnswer }: { saved: Saved; onAnswer: (known: boolean) => void }) {
  const c = copy.placement;
  const i = saved.vocab.length;
  const total = saved.form.vocab.length;
  const item = saved.form.vocab[i];
  // Keyboard shortcuts: Y = I know it, N = I don't know it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === "y") onAnswer(true); else if (k === "n") onAnswer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onAnswer]);
  if (!item) return null;
  return (
    <SimpleShell>
      <PageHeader title={c.wordsTitle} description={c.wordsNote} />
      <ProgressBar value={(i / total) * 100} label={c.wordProgress(i + 1, total)} className="mb-5" />
      <Card className="grain flex min-h-44 items-center justify-center bg-lime text-center">
        <p key={item.id} className="relative z-10 font-display text-4xl font-extrabold" aria-live="polite">{item.text}</p>
      </Card>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button variant="secondary" className="min-h-14" onClick={() => onAnswer(false)}>{c.dontKnow}</Button>
        <Button className="min-h-14" onClick={() => onAnswer(true)}>{c.know}</Button>
      </div>
      <p className="mt-3 hidden text-sm text-muted-foreground md:block">{c.keys}</p>
    </SimpleShell>
  );
}

function Sentences({ saved, onAnswer }: { saved: Saved; onAnswer: (answer: string | null) => void }) {
  const c = copy.placement;
  const i = saved.grammar.length;
  const total = saved.form.grammar.length;
  const item = saved.form.grammar[i];
  if (!item) return null;
  const [before, after = ""] = item.text.split("____");
  return (
    <SimpleShell>
      <PageHeader title={c.sentencesTitle} description={c.sentencesNote} />
      <ProgressBar value={(i / total) * 100} label={c.sentenceProgress(i + 1, total)} className="mb-5" />
      <Card className="mb-5">
        <p key={item.id} className="text-xl" aria-live="polite">{before}<mark className="mx-1 inline-block min-w-16 rounded bg-lime px-2 text-center font-bold text-ink" aria-label="blank">____</mark>{after}</p>
      </Card>
      <div className="grid gap-3" role="group">
        {item.options.map((o) => <button key={o} type="button" className={choice} onClick={() => onAnswer(o)}>{o}</button>)}
        <button type="button" className={cn(choice, "bg-muted")} onClick={() => onAnswer(null)}>{c.notSure}</button>
      </div>
    </SimpleShell>
  );
}
