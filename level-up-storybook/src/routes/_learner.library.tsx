import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/wb/page-header";
import { Card } from "@/components/wb/card";
import { Button } from "@/components/wb/button";
import { EmptyState } from "@/components/wb/empty-state";
import { GenreBadge, LevelBadge } from "@/components/wb/badge";
import { LoadingState, ErrorState } from "@/components/wb/query-states";
import { NotFoundCard } from "@/components/wb/not-found-card";
import { copy } from "@/content/copy";
import { closestApprovedVersion, isOwnBook, readingMinutes, storiesQuery, visibleVersion, type Genre, type Level, type Story, type StoryVersion } from "@/data/stories";
import { learnerLevel, learnerQuery } from "@/data/learner";
import { logEvent } from "@/data/events";
import { cn } from "@/lib/utils";
import { seo } from "@/lib/seo";
import { isLevel, LEVELS } from "@/config/learning";

const GENRES: Genre[] = ["fantasy", "mystery", "funny"];
type Search = { genre?: Genre | undefined; level?: Level | undefined };

export const Route = createFileRoute("/_learner/library")({
  validateSearch: (s: Record<string, unknown>): Search => ({
    genre: GENRES.includes(s["genre"] as Genre) ? (s["genre"] as Genre) : undefined,
    level: isLevel(s["level"]) ? s["level"] : undefined,
  }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(storiesQuery()), context.queryClient.ensureQueryData(learnerQuery())]),
  pendingComponent: LoadingState, errorComponent: ErrorState, notFoundComponent: NotFoundCard,
  head: () => seo("Library", "Pick a story at your level."), component: Library,
});

const chip = (on: boolean) => cn("min-h-11 rounded-full border-2 border-ink px-4 font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", on ? "bg-ink text-paper" : "bg-card hover:bg-muted");

function Library() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/library" });
  const { data: stories } = useSuspenseQuery(storiesQuery());
  const { data: learner } = useSuspenseQuery(learnerQuery());
  const level = search.level ?? learnerLevel(learner);
  useEffect(() => { void logEvent("library_viewed", null, { level }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const own = stories.flatMap((s) => { const v = isOwnBook(s) ? visibleVersion(s, level) : undefined; return v ? [{ s, v }] : []; });
  const items = stories
    .filter((s) => !isOwnBook(s))
    .filter((s) => !search.genre || s.genre === search.genre)
    .flatMap((s) => { const m = closestApprovedVersion(s, level); return m ? [{ s, ...m }] : []; });
  // Stories not ready at this level are shown at the closest level, with a note.
  const someOther = items.some((x) => !x.exact);

  const switchLevel = (to: Level) => {
    if (to === level) return;
    void logEvent("level_switched", null, { from: level, to });
    void navigate({ search: (p) => ({ ...p, level: to }) });
  };

  return (
    <>
      <PageHeader title={copy.library.title} description={copy.library.desc}>
        <Button asChild variant="secondary"><Link to="/add-book"><Plus className="h-5 w-5" aria-hidden />{copy.library.addBook}</Link></Button>
      </PageHeader>
      {own.length > 0 && (
        <section aria-labelledby="my-books" className="mb-10">
          <h2 id="my-books" className="text-2xl font-bold">{copy.library.myBooks}</h2>
          <p className="mb-4 text-muted-foreground">{copy.library.myBooksText}</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{own.map(({ s, v }) => <StoryCard key={s.id} s={s} v={v} />)}</div>
        </section>
      )}
      {own.length > 0 && <h2 className="mb-4 text-2xl font-bold">{copy.library.stories}</h2>}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div role="group" aria-label={copy.library.filter} className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={!search.genre} className={chip(!search.genre)} onClick={() => navigate({ search: (p) => ({ ...p, genre: undefined }) })}>{copy.library.all}</button>
          {GENRES.map((g) => (
            <button key={g} type="button" aria-pressed={search.genre === g} className={chip(search.genre === g)} onClick={() => navigate({ search: (p) => ({ ...p, genre: g }) })}>{copy.library.genres[g]}</button>
          ))}
        </div>
        <div role="group" aria-label={copy.library.level} className="flex gap-1 rounded-full border-2 border-ink bg-card p-1">
          {LEVELS.map((l) => (
            <button key={l} type="button" aria-pressed={level === l} onClick={() => switchLevel(l)} className={cn("min-h-11 min-w-14 rounded-full px-4 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", level === l ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{l}</button>
          ))}
        </div>
      </div>
      {someOther && <p role="note" className="mb-4 rounded-xl border-2 border-ink bg-muted p-3">{copy.library.closest(level)}</p>}
      {items.length === 0 ? <EmptyState title={copy.library.empty} text={copy.library.emptyText} /> : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ s, v }) => <StoryCard key={s.id} s={s} v={v} level={v.level} />)}
        </div>
      )}
    </>
  );
}

function StoryCard({ s, v, level }: { s: Story; v: StoryVersion; level?: Level }) {
  return (
    <Link to="/story/$id" params={{ id: s.id }} search={level ? { level } : {}} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Card className="h-full transition-transform hover:-translate-y-1">
        <div className="flex gap-2"><GenreBadge genre={s.genre} /><LevelBadge level={v.level} /></div>
        <h2 className="mt-3 text-2xl font-bold">{s.title}</h2>
        <p className="text-sm text-muted-foreground">{isOwnBook(s) ? `${copy.story.by} ${s.author} · ` : ""}{readingMinutes(v)} {copy.story.minutes}</p>
        <p className="mt-2">{s.blurb}</p>
      </Card>
    </Link>
  );
}
