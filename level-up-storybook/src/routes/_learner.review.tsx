import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/wb/page-header";
import { Card } from "@/components/wb/card";
import { Button } from "@/components/wb/button";
import { EmptyState } from "@/components/wb/empty-state";
import { LoadingState, ErrorState } from "@/components/wb/query-states";
import { NotFoundCard } from "@/components/wb/not-found-card";
import { copy } from "@/content/copy";
import { cardProgressQuery } from "@/data/review";
import { dueCounts } from "@/lib/review";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_learner/review")({
  loader: ({ context }) => context.queryClient.fetchQuery(cardProgressQuery()),
  pendingComponent: LoadingState, errorComponent: ErrorState, notFoundComponent: NotFoundCard,
  head: () => seo("Review", "Practise your saved words."), component: Review,
});

function Review() {
  const c = copy.review;
  const { data: rows } = useSuspenseQuery(cardProgressQuery());
  const n = dueCounts(rows, new Date());
  return (
    <>
      <PageHeader title={c.title} description={c.desc} />
      {n.now === 0 ? <EmptyState title={c.nothing} text={c.dueTomorrowText(n.tomorrow)} /> : (
        <Card className="mb-5 space-y-3">
          <p className="text-2xl font-bold">{c.dueNow(n.now)}</p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border-2 border-ink bg-lime px-3 py-1 font-semibold">{c.fromStories(n.nowStory)}</span>
            <span className="rounded-full border-2 border-ink bg-mint px-3 py-1 font-semibold">{c.tapped(n.nowTap)}</span>
          </div>
          <Button asChild><Link to="/review/session">{c.start}</Link></Button>
        </Card>
      )}
      <h2 className="mb-3 mt-6 text-xl font-bold">{c.plan}</h2>
      <ul className="grid gap-3 sm:grid-cols-3">
        {([[c.today, n.today], [c.tomorrow, n.tomorrow], [c.week, n.week]] as const).map(([l, v]) => (
          <li key={l}><Card><p className="font-display text-3xl font-extrabold">{v}</p><p className="font-semibold">{l}</p></Card></li>
        ))}
      </ul>
    </>
  );
}
