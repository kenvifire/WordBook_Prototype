import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/wb/page-header";
import { Card } from "@/components/wb/card";
import { ProgressBar } from "@/components/wb/progress-bar";
import { EmptyState } from "@/components/wb/empty-state";
import { Button } from "@/components/wb/button";
import { LoadingState, ErrorState } from "@/components/wb/query-states";
import { NotFoundCard } from "@/components/wb/not-found-card";
import { copy } from "@/content/copy";
import { storiesQuery } from "@/data/stories";
import { learnerLevel, learnerQuery } from "@/data/learner";
import { LevelBadge } from "@/components/wb/badge";
import { activityQuery, cardProgressQuery } from "@/data/review";
import { dueCounts } from "@/lib/review";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_learner/progress")({
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(storiesQuery()),
    context.queryClient.ensureQueryData(learnerQuery()),
    context.queryClient.fetchQuery(cardProgressQuery()),
    context.queryClient.fetchQuery(activityQuery()),
  ]),
  pendingComponent: LoadingState, errorComponent: ErrorState, notFoundComponent: NotFoundCard,
  head: () => seo("Progress", "See how much you have learned."), component: Progress,
});

function Progress() {
  const c = copy.progress;
  const { data: stories } = useSuspenseQuery(storiesQuery());
  const { data: rows } = useSuspenseQuery(cardProgressQuery());
  const { data: act } = useSuspenseQuery(activityQuery());
  const { data: learner } = useSuspenseQuery(learnerQuery());
  const done = new Set(act.completedSections);
  const touched = new Set(rows.map((r) => r.card_id));
  // A story counts as started when the learner has any word from it or finished any part.
  const started = stories.flatMap((s) => s.versions.map((v) => ({ s, v }))).filter(({ v }) => v.sections.some((x) => done.has(x.id) || x.cards.some((k) => touched.has(k.id))));
  const tiles = [[c.sections, done.size, "bg-lime"], [c.mastered, rows.filter((r) => r.mastered_at).length, "bg-mint"], [c.dueToday, dueCounts(rows, new Date()).today, "bg-card"], [c.streak, act.streakDays, "bg-secondary"]] as const;
  return (
    <>
      <PageHeader title={c.title} description={c.desc} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map(([l, v, bg]) => <Card key={l} className={bg}><p className="font-display text-4xl font-extrabold">{v}</p><p className="font-semibold">{l}</p></Card>)}
      </div>
      <Card className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-semibold">{c.level}{learner?.placement_level ? <LevelBadge level={learnerLevel(learner)} /> : <span className="text-muted-foreground">{c.noLevel}</span>}</p>
        <Button asChild variant="secondary" size="sm"><Link to="/placement">{learner?.placement_level ? c.retest : c.test}</Link></Button>
      </Card>
      <h2 className="mb-3 mt-8 text-xl font-bold">{c.stories}</h2>
      {started.length === 0 ? <EmptyState title={c.empty} text={c.emptyText} action={<Button asChild><Link to="/library">{copy.common.toLibrary}</Link></Button>} /> : (
        <div className="space-y-4">{started.map(({ s, v }) => {
          const n = v.sections.length, x = v.sections.filter((k) => done.has(k.id)).length;
          return <Card key={v.id}><ProgressBar label={`${s.title} (${v.level}) · ${c.partsOf(x, n)}`} value={(x / n) * 100} /></Card>;
        })}</div>
      )}
    </>
  );
}
