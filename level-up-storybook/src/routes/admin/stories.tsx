import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/wb/page-header";
import { Card } from "@/components/wb/card";
import { Button } from "@/components/wb/button";
import { Badge, GenreBadge, LevelBadge } from "@/components/wb/badge";
import { notify } from "@/components/wb/toast";
import { adminCopy } from "@/content/copy";
import { LoadingState, ErrorState } from "@/components/wb/query-states";
import { isOwnBook, storiesQuery, type Level, type Story } from "@/data/stories";
import { LEVELS } from "@/config/learning";
import { adaptLevelSection, createLevelVersion } from "@/lib/levels.functions";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/admin/stories")({ loader: ({ context }) => context.queryClient.ensureQueryData(storiesQuery()), pendingComponent: LoadingState, errorComponent: ErrorState, head: () => seo("Admin stories", "Manage stories.", true), component: AdminStories });

function AdminStories() {
  const { data: stories } = useSuspenseQuery(storiesQuery());
  // Learners' own books are private: not listed here.
  const team = stories.filter((s) => !isOwnBook(s));
  return (
    <>
      <PageHeader title={adminCopy.stories.title} description={adminCopy.stories.desc} />
      <div className="space-y-4">{team.map((s) => <StoryLevels key={s.id} story={s} />)}</div>
    </>
  );
}

function StoryLevels({ story }: { story: Story }) {
  const c = adminCopy.stories;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Creates the draft version, then adapts its parts one by one (one AI call each, so no request runs too long).
  async function make(level: Level) {
    setError(null); setWorking(`${c.make(level)}…`);
    try {
      const created = await createLevelVersion({ data: { storyId: story.id, level } });
      if (!created.ok) throw created;
      for (const [i, p] of created.parts.entries()) {
        setWorking(c.working(level, i + 1, created.parts.length));
        const r = await adaptLevelSection({ data: p });
        if (!r.ok) throw r;
      }
      await qc.invalidateQueries({ queryKey: ["stories"] });
      notify.success(c.done(level));
      navigate({ to: "/admin/review/$versionId", params: { versionId: created.versionId } });
    } catch (e) {
      const o = e as { error?: string; detail?: string };
      setError(`${c.errors[o.error ?? "failed"] ?? c.errors["failed"]}${o.detail ? ` (${o.detail})` : ""}`);
      await qc.invalidateQueries({ queryKey: ["stories"] });
    } finally { setWorking(null); }
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2"><h2 className="mr-2 text-xl font-bold">{story.title}</h2><GenreBadge genre={story.genre} /></div>
      <ul className="mt-3 space-y-2">
        {LEVELS.map((l) => {
          const v = story.versions.find((x) => x.level === l);
          return (
            <li key={l} className="flex min-h-11 flex-wrap items-center gap-2 rounded-xl px-2">
              <LevelBadge level={l} />
              {v ? (
                <>
                  <Badge className={v.status === "approved" ? "bg-aqua text-accent-foreground" : "bg-muted"}>{v.status}</Badge>
                  <Button asChild size="sm" variant="ghost"><Link to="/admin/review/$versionId" params={{ versionId: v.id }}>{c.review}</Link></Button>
                  {v.status !== "approved" && <Button size="sm" variant="secondary" disabled={!!working} onClick={() => void make(l)}><Sparkles className="h-4 w-4" aria-hidden />{c.remake(l)}</Button>}
                </>
              ) : (
                <>
                  <span className="text-sm text-muted-foreground">{c.missing}</span>
                  <Button size="sm" disabled={!!working} onClick={() => void make(l)}><Sparkles className="h-4 w-4" aria-hidden />{c.make(l)}</Button>
                </>
              )}
            </li>
          );
        })}
      </ul>
      {working && <p role="status" className="mt-3 font-semibold">{working}</p>}
      {error && <p role="alert" className="mt-3 rounded-xl border-2 border-ink bg-mint p-3 font-semibold">{error}</p>}
    </Card>
  );
}
