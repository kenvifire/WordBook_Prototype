import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Card } from "@/components/wb/card";
import { Button } from "@/components/wb/button";
import { EmptyState } from "@/components/wb/empty-state";
import { LoadingState, ErrorState } from "@/components/wb/query-states";
import { NotFoundCard } from "@/components/wb/not-found-card";
import { FlashcardSession, type SessionStats } from "@/components/wb/flashcard-session";
import { copy } from "@/content/copy";
import { storiesQuery, type Story, type WordCard } from "@/data/stories";
import { learnerQuery } from "@/data/learner";
import { cardProgressQuery } from "@/data/review";
import { logEvent } from "@/data/events";
import { dueCounts, pickSession } from "@/lib/review";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_learner/review_/session")({
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(storiesQuery()),
    context.queryClient.ensureQueryData(learnerQuery()),
    context.queryClient.fetchQuery(cardProgressQuery()),
  ]),
  pendingComponent: LoadingState, errorComponent: ErrorState, notFoundComponent: NotFoundCard,
  head: () => seo("Review session", "Review the words that are due today.", true), component: ReviewSession,
});

function ReviewSession() {
  const { data: stories } = useSuspenseQuery(storiesQuery());
  const { data: rows } = useSuspenseQuery(cardProgressQuery());
  const [round, setRound] = useState(0);
  // Freeze the card list for this round so saved ratings don't reshuffle it.
  const [cards] = useState(() => build(stories, rows));
  const [current, setCurrent] = useState(cards);
  const started = useRef(-1);
  useEffect(() => {
    if (started.current === round || current.length === 0) return; started.current = round;
    void logEvent("review_started", "review", { cards: current.length });
  }, [round, current.length]);
  if (current.length === 0) return <EmptyState title={copy.review.nothing} text={copy.review.desc} action={<Button asChild><Link to="/library">{copy.review.backToLibrary}</Link></Button>} />;
  return <FlashcardSession key={round} cards={current} entity="review" source="review" keepMastered title={copy.review.sessionTitle} desc={copy.review.sessionDesc}
    done={(s) => <Summary stats={s} onMore={(next) => { setCurrent(next); setRound((r) => r + 1); }} />} />;
}

type Stories = Story[];
function build(stories: Stories, rows: Parameters<typeof pickSession>[0] | null): WordCard[] {
  if (!rows) return [];
  const byId = new Map(stories.flatMap((s) => s.versions.flatMap((v) => v.sections.flatMap((x) => x.cards))).map((c) => [c.id, c]));
  return pickSession(rows.filter((r) => byId.has(r.card_id)), new Date()).map((id) => byId.get(id)!);
}

function Summary({ stats, onMore }: { stats: SessionStats; onMore: (next: WordCard[]) => void }) {
  const qc = useQueryClient();
  const router = useRouter();
  const { data: stories } = useSuspenseQuery(storiesQuery());
  const logged = useRef(false);
  const [rows, setRows] = useState<Parameters<typeof pickSession>[0] | null>(null);
  useEffect(() => {
    if (!logged.current) { logged.current = true; void logEvent("review_finished", "review", { reviewed: stats.reviewed, known: stats.known }); }
    // Wait until every rating is saved before reading the new due dates.
    let t: ReturnType<typeof setTimeout>;
    const poll = () => { if (qc.isMutating() > 0) { t = setTimeout(poll, 150); return; }
      void qc.fetchQuery({ ...cardProgressQuery(), staleTime: 0 }).then(setRows).catch(() => setRows([])); void qc.invalidateQueries({ queryKey: ["activity"] }); };
    t = setTimeout(poll, 150);
    return () => clearTimeout(t);
  }, [qc, stats]);
  const counts = rows ? dueCounts(rows, new Date()) : null;
  const next = rows ? build(stories, rows) : [];
  const c = copy.review;
  return (
    <Card className="space-y-4 text-center">
      <p className="text-2xl font-bold">{c.summaryTitle}</p>
      <dl className="grid grid-cols-3 gap-2">
        {([[c.reviewed, stats.reviewed], [c.known, stats.known], [c.dueTomorrow, counts ? counts.tomorrow : "…"]] as const).map(([l, v]) => (
          <div key={l}><dd className="font-display text-3xl font-extrabold">{v}</dd><dt className="text-sm font-semibold">{l}</dt></div>
        ))}
      </dl>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild variant="secondary"><Link to="/library">{c.backToLibrary}</Link></Button>
        {next.length > 0 && <Button onClick={() => { onMore(next); void router.invalidate(); }}>{c.more}</Button>}
      </div>
    </Card>
  );
}
