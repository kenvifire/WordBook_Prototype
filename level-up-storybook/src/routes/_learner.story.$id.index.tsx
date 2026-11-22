import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Lock, LockOpen } from "lucide-react";
import { takeJustUnlocked } from "@/lib/just-unlocked";
import { PageHeader } from "@/components/wb/page-header";
import { Card } from "@/components/wb/card";
import { Button } from "@/components/wb/button";
import { NotFoundCard } from "@/components/wb/not-found-card";
import { Modal } from "@/components/wb/modal";
import { notify } from "@/components/wb/toast";
import { removeOwnBook } from "@/lib/own-books.functions";
import { GenreBadge, LevelBadge } from "@/components/wb/badge";
import { LoadingState, ErrorState } from "@/components/wb/query-states";
import { copy } from "@/content/copy";
import { cn } from "@/lib/utils";
import { findStory, isOwnBook, isSectionOpen, readingMinutes, storiesQuery, unlockedQuery, visibleVersion, type Level } from "@/data/stories";
import { learnerLevel, learnerQuery } from "@/data/learner";
import { logEvent } from "@/data/events";
import { seo } from "@/lib/seo";
import { isLevel } from "@/config/learning";

export const Route = createFileRoute("/_learner/story/$id/")({
  validateSearch: (s: Record<string, unknown>): { level?: Level | undefined } => ({ level: isLevel(s["level"]) ? s["level"] : undefined }),
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(storiesQuery()),
    context.queryClient.ensureQueryData(learnerQuery()),
    context.queryClient.ensureQueryData(unlockedQuery()),
  ]),
  pendingComponent: LoadingState, errorComponent: ErrorState, notFoundComponent: NotFoundCard,
  head: () => seo("Story", "Story details and parts."), component: StoryPage,
});

function StoryPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const { data: stories } = useSuspenseQuery(storiesQuery());
  const { data: learner } = useSuspenseQuery(learnerQuery());
  const { data: unlocked } = useSuspenseQuery(unlockedQuery());
  const level = search.level ?? learnerLevel(learner);
  const story = findStory(stories, id);
  const version = story && visibleVersion(story, level);
  const own = !!story && isOwnBook(story);
  useEffect(() => { if (version) void logEvent("story_viewed", id, { level, version_id: version.id }); }, [id, version?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!story || !version) return <NotFoundCard />;
  return (
    <>
      <div className="mb-3 flex gap-2"><GenreBadge genre={story.genre} /><LevelBadge level={version.level} /></div>
      <PageHeader title={story.title} description={story.blurb} />
      <p className="-mt-4 mb-6 text-muted-foreground">{copy.story.by} {story.author} · {readingMinutes(version)} {copy.story.minutes}</p>

      <Card className="mb-4 bg-muted">
        <p className="font-bold">{own ? copy.ownBooks.note : copy.story.adapted}</p>
        {story.contentNote && (<><h2 className="mt-3 text-lg font-bold">{copy.story.noteTitle}</h2><p>{story.contentNote}</p></>)}
      </Card>

      <h2 className="mb-3 text-xl font-bold">{copy.story.sections}</h2>
      <JustUnlocked ids={version.sections.map((s) => s.id)}>{(fresh) => (
      <ol className="mb-6 space-y-3">
        {version.sections.map((s, i) => {
          const open = isSectionOpen(version.sections, i, unlocked);
          const isNew = open && fresh.includes(s.id);
          return (
            <li key={s.id} id={isNew ? "just-unlocked" : undefined}>
              <Card className={cn("flex flex-wrap items-center justify-between gap-3", isNew && "unlock-glow")}>
                <div>
                  {isNew && <p role="status" className="unlock-pop mb-1 inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-lime px-3 py-0.5 text-sm font-bold"><LockOpen className="h-4 w-4" aria-hidden />{copy.story.justUnlocked}</p>}
                  <p className="font-bold">{s.order}. {s.title}</p><p className="text-sm text-muted-foreground">{own && s.cards.length === 0 ? copy.ownBooks.notReady : `${s.cards.length} ${copy.story.words}`}</p></div>
                {open ? (
                  <Button asChild size="sm"><Link to="/story/$id/prepare/$sectionId" params={{ id, sectionId: s.id }}>{copy.story.prepare}</Link></Button>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="h-5 w-5 shrink-0" aria-label={copy.story.lockedLabel} />{copy.story.locked}</p>
                )}
              </Card>
            </li>
          );
        })}
      </ol>
      )}</JustUnlocked>

      <Card>
        <h2 className="mb-2 text-lg font-bold">{copy.story.attribution}</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          <dt className="font-bold">{copy.story.author}</dt><dd>{story.author}</dd>
          <dt className="font-bold">{copy.story.source}</dt><dd>{story.source || "—"}</dd>
          <dt className="font-bold">{copy.story.license}</dt><dd>{story.license || "—"}</dd>
        </dl>
      </Card>
      {own && <RemoveBook storyId={story.id} />}
    </>
  );
}

function RemoveBook({ storyId }: { storyId: string }) {
  const c = copy.ownBooks;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  async function remove() {
    setBusy(true);
    try {
      const res = await removeOwnBook({ data: { storyId } });
      if (!res.ok) { notify.error(c.errors[res.error]); setBusy(false); return; }
      qc.removeQueries({ queryKey: ["stories"] });
      notify.success(c.removed);
      navigate({ to: "/library" });
    } catch { notify.error(c.errors.save_failed); setBusy(false); }
  }
  return (
    <>
      <Button variant="ghost" className="mt-6" onClick={() => setOpen(true)}>{c.remove}</Button>
      <Modal open={open} onOpenChange={setOpen} title={c.remove} description={c.removeConfirm}>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void remove()} disabled={busy}>{c.removeYes}</Button>
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>{c.removeNo}</Button>
        </div>
      </Modal>
    </>
  );
}

// Shows "Unlocked!" on parts the learner just opened by passing a quiz (once), and scrolls to the first one.
function JustUnlocked({ ids, children }: { ids: string[]; children: (fresh: string[]) => React.ReactNode }) {
  const [fresh, setFresh] = useState<string[]>([]);
  const taken = useRef<string[] | null>(null);
  const key = ids.join(",");
  useEffect(() => {
    taken.current ??= takeJustUnlocked(key.split(","));
    const hit = taken.current;
    if (!hit.length) return;
    setFresh(hit);
    requestAnimationFrame(() => document.getElementById("just-unlocked")?.scrollIntoView({ behavior: "smooth", block: "center" }));
    const t = window.setTimeout(() => setFresh([]), 8000); // a short, temporary label
    return () => window.clearTimeout(t);
  }, [key]);
  return <>{children(fresh)}</>;
}
