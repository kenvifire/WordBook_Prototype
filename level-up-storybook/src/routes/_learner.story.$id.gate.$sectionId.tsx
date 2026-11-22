import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LockOpen } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/wb/page-header";
import { Card } from "@/components/wb/card";
import { Button } from "@/components/wb/button";
import { EmptyState } from "@/components/wb/empty-state";
import { LoadingState, ErrorState } from "@/components/wb/query-states";
import { NotFoundCard } from "@/components/wb/not-found-card";
import { notify } from "@/components/wb/toast";
import { copy } from "@/content/copy";
import { GATE_BATCH_SIZE, MAX_FAILED_ATTEMPTS_BEFORE_OVERRIDE } from "@/config/learning";
import { findSection, storiesQuery, type Story, type WordCard } from "@/data/stories";
import { attemptsQuery, markMastered, overrideUnlock, saveAttempt, thresholdQuery } from "@/data/gate";
import { logEvent } from "@/data/events";
import { buildQuiz, canOfferEarlyRead, canOverride, canRunQuiz, hasPassed, resultRate } from "@/lib/gate";
import { markJustUnlocked } from "@/lib/just-unlocked";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_learner/story/$id/gate/$sectionId")({
  loader: ({ context, params }) => Promise.all([
    context.queryClient.ensureQueryData(storiesQuery()),
    context.queryClient.ensureQueryData(thresholdQuery()),
    context.queryClient.ensureQueryData(attemptsQuery(params.sectionId)),
  ]),
  pendingComponent: LoadingState, errorComponent: ErrorState, notFoundComponent: NotFoundCard,
  head: () => seo("Word quiz", "A short quiz to open the next part."), component: Gate,
});

function Gate() {
  const { sectionId } = Route.useParams();
  const { data: stories } = useSuspenseQuery(storiesQuery());
  const section = findSection(stories, sectionId);
  // Memoized: the quiz is built once from these arrays and must not reshuffle on every answer.
  const { others, next } = useMemo(() => neighbours(stories, sectionId), [stories, sectionId]);
  if (!section) return <NotFoundCard />;
  if (!canRunQuiz(section.cards, others)) return <EmptyState title={copy.gate.empty} text={copy.gate.emptyText} />;
  return <Quiz cards={section.cards} others={others} next={next} />;
}

// Cards of the other parts of the same version (extra wrong answers) and the part that opens after this one.
function neighbours(stories: Story[], sectionId: string) {
  const version = stories.flatMap((s) => s.versions).find((v) => v.sections.some((x) => x.id === sectionId));
  const sections = version?.sections ?? [];
  const at = sections.findIndex((x) => x.id === sectionId);
  return { others: sections.filter((x) => x.id !== sectionId).flatMap((x) => x.cards), next: at >= 0 ? sections[at + 1] : undefined };
}

const pct = (r: number) => Math.round(r * 100);

// Shows the example with the word highlighted; falls back to just the word.
function InContext({ card }: { card: WordCard }) {
  const i = card.example.toLowerCase().indexOf(card.word.toLowerCase());
  if (i < 0) return <p className="font-display text-3xl font-extrabold">{card.word}</p>;
  return <p className="text-lg">{card.example.slice(0, i)}<mark className="rounded bg-lime px-1 font-bold text-ink">{card.example.slice(i, i + card.word.length)}</mark>{card.example.slice(i + card.word.length)}</p>;
}

function Quiz({ cards, others, next: nextSection }: { cards: WordCard[]; others: WordCard[]; next?: { id: string; order: number; title: string } | undefined }) {
  const { id, sectionId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: threshold } = useSuspenseQuery(thresholdQuery());
  const { data: attempts } = useSuspenseQuery(attemptsQuery(sectionId));
  const attemptNo = attempts.lastAttemptNo + 1;
  const questions = useMemo(() => buildQuiz(cards, Math.random, 3, others), [cards, others]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [right, setRight] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [result, setResult] = useState<{ rate: number; passed: boolean } | null>(null);
  const [earlyChoice, setEarlyChoice] = useState(false);
  const startedAt = useRef(Date.now());
  const nextRef = useRef<HTMLButtonElement>(null);
  // After an answer, move focus to Next (keyboard: press Enter) without jumping the page.
  useEffect(() => { if (picked) nextRef.current?.focus({ preventScroll: true }); }, [picked]);
  const started = useRef(false);
  const total = questions.length;
  const q = questions[i];

  useEffect(() => {
    if (started.current) return; started.current = true;
    void logEvent("gate_started", sectionId, { attempt_no: attemptNo, threshold });
  }, [sectionId, attemptNo, threshold]);

  const refresh = () => {
    qc.removeQueries({ queryKey: ["unlocked-sections"] });
    void qc.invalidateQueries({ queryKey: ["attempts", sectionId] });
  };

  const finish = useMutation({
    mutationFn: async () => {
      const rate = resultRate(right.length, right.length + wrong.length);
      const passed = hasPassed(rate, threshold);
      await saveAttempt({ sectionId, attemptNo, rate, passed, threshold, missed: passed ? [] : wrong, durationSeconds: Math.round((Date.now() - startedAt.current) / 1000) });
      if (passed) await markMastered(right);
      await logEvent("gate_finished", sectionId, { score: rate, passed, attempt_no: attemptNo });
      if (passed) await logEvent("section_unlocked", sectionId, { attempt_no: attemptNo, override: false });
      return { rate, passed };
    },
    onSuccess: (r) => { setResult(r); if (r.passed && nextSection) markJustUnlocked(nextSection.id); refresh(); },
    onError: () => notify.error(copy.gate.saveError),
  });

  const override = useMutation({
    mutationFn: async () => {
      await overrideUnlock(sectionId, attemptNo, threshold);
      await logEvent("gate_override_used", sectionId, { attempt_no: attemptNo, failed_attempts: attempts.failed + 1 });
      await logEvent("section_unlocked", sectionId, { attempt_no: attemptNo, override: true });
    },
    onSuccess: () => { if (nextSection) markJustUnlocked(nextSection.id); refresh(); void navigate({ to: "/read/$sectionId", params: { sectionId } }); },
    onError: () => notify.error(copy.gate.saveError),
  });

  const choose = (opt: string) => {
    if (picked || !q) return;
    setPicked(opt);
    if (opt === q.card.meaning) setRight((r) => [...r, q.card.id]); else setWrong((w) => [...w, q.card.id]);
  };
  const next = () => {
    if (i + 1 >= total) { finish.mutate(); return; }
    if (canOfferEarlyRead(i + 1, wrong.length, total)) { setEarlyChoice(true); return; }
    setI(i + 1); setPicked(null); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const continueQuiz = () => { setEarlyChoice(false); setI(i + 1); setPicked(null); window.scrollTo({ top: 0 }); };

  const score = right.length;
  const header = <PageHeader title={copy.gate.title} description={copy.gate.desc(pct(threshold))} />;

  if (result?.passed) return (
    <>{header}
      <Card className="grain bg-mint text-center">
        <p className="relative z-10 font-display text-3xl font-extrabold">{copy.gate.passTitle}</p>
        <p className="relative z-10 mt-2 text-lg">{copy.gate.passText(pct(result.rate))}</p>
        {nextSection && (
          <p className="unlock-pop relative z-10 mx-auto mt-4 inline-flex items-center gap-2 rounded-full border-2 border-ink bg-lime px-4 py-2 font-bold">
            <LockOpen className="h-5 w-5" aria-hidden />{copy.gate.nextUnlocked(nextSection.order, nextSection.title)}
          </p>
        )}
        <Button asChild className="relative z-10 mt-5"><Link to="/read/$sectionId" params={{ sectionId }}>{copy.gate.read}</Link></Button>
      </Card>
    </>
  );

  if (result) {
    const missed = cards.filter((c) => wrong.includes(c.id));
    const failedSoFar = attempts.failed; // already includes this attempt after refresh
    return (
      <>{header}
        <Card>
          <p className="font-display text-3xl font-extrabold">{copy.gate.failTitle}</p>
          <p className="mt-2 text-lg">{copy.gate.failText(pct(result.rate), pct(threshold))}</p>
          <h2 className="mt-4 font-bold">{copy.gate.missed}</h2>
          <ul className="mt-2 flex flex-wrap gap-2">{missed.map((c) => <li key={c.id} className="rounded-full border-2 border-ink bg-muted px-3 py-1 font-semibold">{c.word}</li>)}</ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild><Link to="/story/$id/prepare/$sectionId" params={{ id, sectionId }} search={{ only: missed.map((c) => c.id).join(",") }}>{copy.gate.practice}</Link></Button>
            {canOverride(failedSoFar, MAX_FAILED_ATTEMPTS_BEFORE_OVERRIDE) && (
              <Button variant="ghost" disabled={override.isPending} onClick={() => override.mutate()}>{copy.gate.readAnyway}</Button>
            )}
          </div>
        </Card>
      </>
    );
  }

  if (earlyChoice) return (
    <>{header}
      <Card className="grain bg-mint text-center">
        <p className="relative z-10 font-display text-3xl font-extrabold">{copy.gate.earlyTitle}</p>
        <p className="relative z-10 mt-2 text-lg">{copy.gate.earlyText(GATE_BATCH_SIZE)}</p>
        <div className="relative z-10 mt-5 flex flex-wrap justify-center gap-3">
          <Button disabled={finish.isPending} onClick={() => finish.mutate()}>{copy.gate.read}</Button>
          <Button variant="secondary" disabled={finish.isPending} onClick={continueQuiz}>{copy.gate.continue}</Button>
        </div>
      </Card>
    </>
  );

  if (!q) return null;
  const isRight = picked === q.card.meaning;
  return (
    <>{header}
      <div className="mb-5">
        <div className="mb-1 flex justify-between text-sm font-semibold"><span>{copy.gate.score(score, total)}</span><span>{copy.gate.passMark(pct(threshold))}</span></div>
        <div role="progressbar" aria-label={copy.gate.score(score, total)} aria-valuenow={pct(score / total)} aria-valuemin={0} aria-valuemax={100} className="relative h-4 rounded-full border-2 border-ink bg-muted">
          <div className="h-full rounded-full bg-aqua transition-all" style={{ width: `${(score / total) * 100}%` }} />
          <div aria-hidden className="absolute -top-1.5 h-6 w-1 rounded bg-ink" style={{ left: `calc(${pct(threshold)}% - 2px)` }} />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{i + 1} / {total}</p>
      </div>
      <Card className="space-y-4">
        <InContext card={q.card} />
        <p className="text-xl font-bold">{copy.gate.question(q.card.word)}</p>
        <div className="grid gap-3" role="group">
          {q.options.map((opt) => {
            const state = !picked ? "" : opt === q.card.meaning ? "border-success bg-success text-primary-foreground" : opt === picked ? "bg-destructive/20" : "opacity-60";
            return <button key={opt} type="button" disabled={!!picked} onClick={() => choose(opt)}
              className={cn("min-h-12 rounded-xl border-2 border-ink px-4 py-2 text-left font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", !picked && "hover:bg-muted", state)}>{picked && opt === q.card.meaning ? "✓ " : ""}{opt}</button>;
          })}
        </div>
      </Card>
      {/* Answer feedback and the Next button stay in view (sticky at the bottom, above the mobile tabs), so no scrolling is needed. */}
      {picked && (
        <div className="sticky bottom-[calc(var(--tabbar-h)+0.75rem)] z-20 mt-4 md:bottom-4">
          <div role="status" className={cn("flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-ink p-3 shadow-lg", isRight ? "bg-success-soft" : "bg-card")}>
            <div className="min-w-0 flex-1">
              <p className="font-bold">{isRight ? "✓ " : "✗ "}{isRight ? copy.gate.correct : copy.gate.wrong}</p>
              {!isRight && <p className="text-sm">{copy.gate.rightAnswer} {q.card.meaning}</p>}
            </div>
            <Button ref={nextRef} className="min-h-12 shrink-0" disabled={finish.isPending} onClick={next}>{i + 1 < total ? copy.gate.next : copy.gate.finish}</Button>
          </div>
        </div>
      )}
    </>
  );
}
