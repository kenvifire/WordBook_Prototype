import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/wb/page-header";
import { Card } from "@/components/wb/card";
import { Button } from "@/components/wb/button";
import { Badge, LevelBadge } from "@/components/wb/badge";
import { EmptyState } from "@/components/wb/empty-state";
import { notify } from "@/components/wb/toast";
import { adminCopy } from "@/content/copy";
import { LoadingState, ErrorState } from "@/components/wb/query-states";
import { findStory, findVersion, storiesQuery } from "@/data/stories";
import { setVersionStatus } from "@/lib/levels.functions";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/admin/review/$versionId")({ loader: ({ context }) => context.queryClient.ensureQueryData(storiesQuery()), pendingComponent: LoadingState, errorComponent: ErrorState, head: () => seo("Review version", "Approve a story version.", true), component: ReviewVersion });

function ReviewVersion() {
  const c = adminCopy.review;
  const { versionId } = Route.useParams();
  const { data: stories } = useSuspenseQuery(storiesQuery());
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const v = findVersion(stories, versionId);
  if (!v) return <EmptyState title="Version not found" text="Check the link." action={<Button asChild><Link to="/admin/stories">Stories</Link></Button>} />;
  const story = findStory(stories, v.storyId);

  async function setStatus(status: "approved" | "draft") {
    setBusy(true);
    try {
      const r = await setVersionStatus({ data: { versionId, status } });
      if (!r.ok) { notify.error(adminCopy.stories.errors[r.error] ?? adminCopy.stories.errors["failed"]!); return; }
      await qc.invalidateQueries({ queryKey: ["stories"] });
      notify.success(status === "approved" ? c.approved : c.sentBack);
    } catch { notify.error(adminCopy.stories.errors["failed"]!); } finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title={`${c.title}: ${story?.title ?? v.storyId}`} description={c.desc}>
        <div className="flex gap-2">
          <Button variant="ghost" disabled={busy || v.status !== "approved"} onClick={() => void setStatus("draft")}>{c.reject}</Button>
          <Button disabled={busy || v.status === "approved"} onClick={() => void setStatus("approved")}>{c.approve}</Button>
        </div>
      </PageHeader>
      <p className="mb-4 flex flex-wrap items-center gap-2 font-semibold">{c.status}<LevelBadge level={v.level} /><Badge className={v.status === "approved" ? "bg-aqua text-accent-foreground" : "bg-muted"}>{v.status}</Badge></p>
      {v.status !== "approved" && <p role="note" className="mb-4 rounded-xl border-2 border-ink bg-muted p-3">{c.ai}</p>}
      <div className="space-y-4">
        {v.sections.map((s) => (
          <Card key={s.id}><h2 className="text-xl font-bold">{s.order}. {s.title}</h2><p className="reader-text mt-2 whitespace-pre-line">{s.text}</p>
            <p className="mt-3 text-sm text-muted-foreground">{s.cards.map((k) => `${k.word}: ${k.meaning}`).join(" · ")}</p></Card>
        ))}
      </div>
    </>
  );
}
