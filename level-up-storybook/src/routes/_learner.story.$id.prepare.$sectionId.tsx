import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/wb/page-header";
import { Card } from "@/components/wb/card";
import { Button } from "@/components/wb/button";
import { EmptyState } from "@/components/wb/empty-state";
import { LoadingState, ErrorState } from "@/components/wb/query-states";
import { NotFoundCard } from "@/components/wb/not-found-card";
import { copy } from "@/content/copy";
import { findSection, findStory, isOwnBook, storiesQuery, type WordCard } from "@/data/stories";
import { makeSectionCards } from "@/lib/own-books.functions";
import { learnerQuery } from "@/data/learner";
import { gateQuery, unlockWithoutGate } from "@/data/prepare";
import { logEvent } from "@/data/events";
import { FlashcardSession } from "@/components/wb/flashcard-session";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_learner/story/$id/prepare/$sectionId")({
  // only: card ids to practise (missed words from a failed quiz).
  validateSearch: (s: Record<string, unknown>): { only?: string | undefined } => ({ only: typeof s["only"] === "string" && s["only"] ? s["only"] : undefined }),
  loader: ({ context, params }) => Promise.all([
    context.queryClient.ensureQueryData(storiesQuery()),
    context.queryClient.ensureQueryData(learnerQuery()),
    context.queryClient.ensureQueryData(gateQuery(params.sectionId)),
  ]),
  pendingComponent: LoadingState, errorComponent: ErrorState, notFoundComponent: NotFoundCard,
  head: () => seo("Learn the words", "Learn key words before you read."), component: Prepare,
});

function Prepare() {
  const { sectionId } = Route.useParams();
  const { data: stories } = useSuspenseQuery(storiesQuery());
  const { data: gateEnabled } = useSuspenseQuery(gateQuery(sectionId));
  const { only } = Route.useSearch();
  const section = findSection(stories, sectionId);
  if (!section) return <NotFoundCard />;
  const ids = only?.split(",");
  const cards = ids ? section.cards.filter((c) => ids.includes(c.id)) : section.cards;
  if (!gateEnabled) return <SkipGate sectionId={sectionId} />;
  const story = findStory(stories, section.storyId);
  if (section.cards.length === 0 && story && isOwnBook(story)) return <MakeCards sectionId={sectionId} />;
  if (cards.length === 0) return <EmptyState title={copy.prepare.empty} text={copy.prepare.emptyText} />;
  return <Session key={only ?? "all"} cards={cards} />;
}

function SkipGate({ sectionId }: { sectionId: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const ran = useRef(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (ran.current) return; ran.current = true;
    unlockWithoutGate(sectionId)
      .then(() => logEvent("gate_skipped_by_design", sectionId))
      .then(() => qc.removeQueries({ queryKey: ["unlocked-sections"] }))
      .then(() => navigate({ to: "/read/$sectionId", params: { sectionId }, replace: true }))
      .catch(() => setFailed(true));
  }, [sectionId, navigate, qc]);
  return failed ? <ErrorState error={new Error(copy.common.errorText)} reset={() => location.reload()} /> : <p className="py-10 text-center">{copy.prepare.opening}</p>;
}

// Own books: cards for a part are made by AI the first time the learner opens it.
function MakeCards({ sectionId }: { sectionId: string }) {
  const c = copy.ownBooks;
  const qc = useQueryClient();
  const ran = useRef(false);
  const [error, setError] = useState<{ text: string; detail: string } | null>(null);
  const run = () => {
    setError(null);
    makeSectionCards({ data: { sectionId } })
      .then(async (res) => {
        if (!res.ok) { setError({ text: c.errors[res.error], detail: `${res.error}: ${res.detail}` }); return; }
        await qc.invalidateQueries({ queryKey: ["stories"] });
      })
      .catch((e: unknown) => setError({ text: c.errors.failed, detail: e instanceof Error ? e.message : String(e) }));
  };
  useEffect(() => { if (ran.current) return; ran.current = true; run(); });
  if (error) return (
    <EmptyState title={copy.common.errorTitle} text={error.text}
      action={<div className="flex flex-col items-center gap-3"><Button onClick={run}>{c.retry}</Button><p className="max-w-md break-words text-xs text-muted-foreground">{c.detailLabel} {error.detail}</p></div>} />
  );
  return (
    <Card className="text-center" role="status">
      <p className="text-xl font-bold">{c.making}</p>
      <p className="mt-2 text-muted-foreground">{c.makingText}</p>
    </Card>
  );
}

function Session({ cards }: { cards: WordCard[] }) {
  const { id, sectionId } = Route.useParams();
  return (
    <FlashcardSession cards={cards} entity={sectionId} source="prepare" startEvent="prepare_started"
      done={() => (
        <Card className="text-center">
          <p className="mb-4 text-xl font-bold">{copy.prepare.done}</p>
          <Button asChild><Link to="/story/$id/gate/$sectionId" params={{ id, sectionId }}>{copy.prepare.toGate}</Link></Button>
        </Card>
      )} />
  );
}
