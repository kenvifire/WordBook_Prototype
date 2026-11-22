import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/wb/page-header";
import { Card } from "@/components/wb/card";
import { Button } from "@/components/wb/button";
import { notify } from "@/components/wb/toast";
import { copy } from "@/content/copy";
import { useSuspenseQuery } from "@tanstack/react-query";
import { LoadingState, ErrorState } from "@/components/wb/query-states";
import { findSection, logLookup, storiesQuery, unlockedQuery } from "@/data/stories";
import { logEvent } from "@/data/events";
import { seo } from "@/lib/seo";
import { NotFoundCard } from "@/components/wb/not-found-card";

export const Route = createFileRoute("/_learner/read/$sectionId")({ loader: async ({ context, params }) => {
  // Guard: a part can be read only after it was unlocked for this learner.
  const [stories, unlocked] = await Promise.all([context.queryClient.ensureQueryData(storiesQuery()), context.queryClient.fetchQuery(unlockedQuery())]);
  const section = findSection(stories, params.sectionId);
  if (section && !unlocked.includes(section.id)) throw redirect({ to: "/story/$id/prepare/$sectionId", params: { id: section.storyId, sectionId: section.id } });
}, pendingComponent: LoadingState, errorComponent: ErrorState,  head: () => seo("Read", "Read the story. Tap a word to see its meaning."), component: Read });

function Read() {
  const { sectionId } = Route.useParams();
  const { data: stories } = useSuspenseQuery(storiesQuery());
  const section = findSection(stories, sectionId);
  const [tip, setTip] = useState<string | null>(null);
  if (!section) return <NotFoundCard />;
  const dict = new Map(section.cards.map((c) => [c.word.toLowerCase(), c]));
  return (
    <>
      <PageHeader title={section.title} description={copy.read.desc} />
      <Card className="reader-text max-w-2xl">
        {/* A blank line in the text starts a new paragraph (uploaded books have many). */}
        {section.text.split(/\n\s*\n/).map((para, p) => (
          <p key={p} className="mb-4 last:mb-0">
            {para.split(/(\s+)/).map((tok, i) => {
              const key = tok.toLowerCase().replace(/[^a-z']/g, "");
              const c = dict.get(key);
              if (!c) return <span key={i}>{tok}</span>;
              // Only the word is marked; punctuation around it ("estate," or "(word)") stays plain text.
              const [, before = "", word = tok, after = ""] = tok.match(/^([^A-Za-z']*)(.*?)([^A-Za-z']*)$/) ?? [];
              return <span key={i}>{before}<button className="rounded bg-lime px-0.5 font-semibold underline decoration-dotted" onClick={() => { setTip(`${key}: ${c.meaning}`); notify.success(copy.read.added); void logLookup(key, section.id, c.id).catch(() => {}); }}>{word}</button>{after}</span>;
            })}
          </p>
        ))}
      </Card>
      {tip && <p className="mt-4 rounded-xl border-2 border-ink bg-mint p-3 font-semibold" role="status">{tip}</p>}
      <Button asChild className="mt-6"><Link onClick={() => void logEvent("section_completed", section.id)} to="/story/$id" params={{ id: section.storyId }} search={{ level: section.level }}>{copy.read.done}</Link></Button>
    </>
  );
}
