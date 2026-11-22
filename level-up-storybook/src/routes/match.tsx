import { createFileRoute, Link } from "@tanstack/react-router";
import { SimpleShell } from "@/components/wb/simple-shell";
import { PageHeader } from "@/components/wb/page-header";
import { Card } from "@/components/wb/card";
import { Button } from "@/components/wb/button";
import { EmptyState } from "@/components/wb/empty-state";
import { GenreBadge, LevelBadge } from "@/components/wb/badge";
import { copy } from "@/content/copy";
import { useSuspenseQuery } from "@tanstack/react-query";
import { LoadingState, ErrorState } from "@/components/wb/query-states";
import { closestApprovedVersion, isOwnBook, readingMinutes, storiesQuery } from "@/data/stories";
import { learnerLevel, learnerQuery } from "@/data/learner";
import { requireConsent } from "@/lib/guards";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/match")({
  ssr: false,
  beforeLoad: ({ context }) => requireConsent(context.queryClient),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(storiesQuery()), context.queryClient.ensureQueryData(learnerQuery())]),
  pendingComponent: LoadingState, errorComponent: ErrorState,
  head: () => seo("Your level", "Your English level and stories picked for you."),
  component: Match,
});

// Team stories at the learner's level; a story not ready at that level is shown at the closest level.
function Match() {
  const { data: stories } = useSuspenseQuery(storiesQuery());
  const { data: learner } = useSuspenseQuery(learnerQuery());
  const level = learnerLevel(learner);
  const picks = stories.filter((s) => !isOwnBook(s)).flatMap((s) => { const m = closestApprovedVersion(s, level); return m ? [{ s, ...m }] : []; })
    .sort((a, b) => Number(b.exact) - Number(a.exact));
  return (
    <SimpleShell>
      <PageHeader title={copy.match.title(level)} description={copy.match.desc} />
      {picks.some((p) => !p.exact) && <p role="note" className="mb-4 rounded-xl border-2 border-ink bg-muted p-3">{copy.library.closest(level)}</p>}
      {picks.length === 0 ? <EmptyState title={copy.match.empty} text={copy.match.emptyText} /> : (
        <div className="space-y-3">
          {picks.map(({ s, v }) => (
            <Link key={s.id} to="/story/$id" params={{ id: s.id }} search={{ level: v.level }} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Card className="flex flex-wrap items-center justify-between gap-3 transition-transform hover:-translate-y-0.5">
                <span><span className="block font-bold">{s.title}</span><span className="text-sm text-muted-foreground">{readingMinutes(v)} {copy.story.minutes}</span></span>
                <span className="flex gap-2"><GenreBadge genre={s.genre} /><LevelBadge level={v.level} /></span>
              </Card>
            </Link>
          ))}
        </div>
      )}
      <Button asChild className="mt-6"><Link to="/library">{copy.match.button}</Link></Button>
    </SimpleShell>
  );
}
