import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { PageHeader } from "./page-header";
import { Card } from "./card";
import { Button } from "./button";
import { ProgressBar } from "./progress-bar";
import { notify } from "./toast";
import { copy } from "@/content/copy";
import { translationFor, type WordCard } from "@/data/stories";
import { learnerQuery, saveCardLanguage, saveShowTranslation, type LearnerRow } from "@/data/learner";
import { saveRating } from "@/data/prepare";
import { logEvent } from "@/data/events";
import { requeue, type Rating } from "@/lib/srs";
import { cn } from "@/lib/utils";

export type SessionStats = { reviewed: number; known: number };

// One flashcard session for both word preparation and review: same card, ratings, requeue rule and translation switch.
export function FlashcardSession({ cards, entity, source, startEvent, keepMastered, title = copy.prepare.title, desc = copy.prepare.desc, done }: {
  cards: WordCard[]; entity: string; source: "prepare" | "review"; startEvent?: string; keepMastered?: boolean;
  title?: string; desc?: string; done: (stats: SessionStats) => React.ReactNode;
}) {
  const [stats, setStats] = useState<SessionStats>({ reviewed: 0, known: 0 });
  const rated = useRef(new Set<string>());
  const { data: learner } = useSuspenseQuery(learnerQuery());
  const [queue, setQueue] = useState(cards);
  const [flipped, setFlipped] = useState(false);
  const qc = useQueryClient();
  const lang = learner?.first_language ?? "";
  const showTr = learner?.show_translation ?? false;
  const setPref = (patch: Partial<LearnerRow>, save: () => Promise<void>) => {
    const prev = qc.getQueryData<LearnerRow | null>(["learner"]);
    if (prev) qc.setQueryData(["learner"], { ...prev, ...patch });
    save().catch(() => { qc.setQueryData(["learner"], prev); notify.error(copy.prepare.prefError); });
  };
  const shownAt = useRef(Date.now());
  const started = useRef(false);
  const total = cards.length;
  const learned = total - queue.length;
  const card = queue[0];

  useEffect(() => {
    if (started.current) return; started.current = true;
    if (startEvent) void logEvent(startEvent, entity, { cards: total });
  }, [entity, total, startEvent]);

  const rate = useMutation({
    mutationFn: ({ card, rating }: { card: WordCard; rating: Rating }) => saveRating(card.id, rating, { keepMastered }),
    onError: () => notify.error(copy.prepare.saveError),
  });

  const onRate = (rating: Rating) => {
    if (!card) return;
    void logEvent("card_rated", entity, { card_id: card.id, rating, source, response_ms: Date.now() - shownAt.current });
    const first = !rated.current.has(card.id); rated.current.add(card.id);
    setStats((s) => ({ reviewed: s.reviewed + (first ? 1 : 0), known: s.known + (rating === "know" ? 1 : 0) }));
    rate.mutate({ card, rating });
    setQueue((q) => requeue(q, rating));
    setFlipped(false); shownAt.current = Date.now();
  };

  const translation = card ? translationFor(card, learner?.first_language) : null;

  return (
    <>
      <PageHeader title={title} description={desc} />
      <ProgressBar value={(learned / total) * 100} label={copy.prepare.progress(learned, total)} className="mb-5" />

      {!card ? done(stats) : (
        <>
          <button type="button" onClick={() => setFlipped((f) => !f)} aria-label={flipped ? copy.prepare.tapBack : copy.prepare.tapToFlip}
            className="block w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Card className={cn("grain flex min-h-64 flex-col items-center justify-center text-center", flipped ? "bg-mint" : "bg-lime")}>
              {!flipped ? (
                <>
                  <p className="relative z-10 font-display text-4xl font-extrabold">{card.word}</p>
                  <p className="relative z-10 mt-4 text-lg italic">{card.example}</p>
                </>
              ) : (
                <p className="relative z-10 text-2xl font-bold">{card.meaning}</p>
              )}
              <p className="relative z-10 mt-6 text-sm">{flipped ? copy.prepare.tapBack : copy.prepare.tapToFlip}</p>
            </Card>
          </button>
          {flipped && (
            <div className="mt-3 space-y-2">
              <label className="block font-bold">{copy.prepare.cardLanguage}
                <select value={lang} onChange={(e) => setPref({ first_language: e.target.value }, () => saveCardLanguage(e.target.value))}
                  className="mt-1 block min-h-11 w-full rounded-xl border-2 border-ink bg-background px-3 font-normal">
                  {copy.consent.languages.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
              {translation ? (
                <>
                  <label className="flex min-h-11 items-center gap-3 font-bold">
                    <input type="checkbox" className="h-6 w-6" checked={showTr} onChange={(e) => { const on = e.target.checked; setPref({ show_translation: on }, () => saveShowTranslation(on)); }} />
                    {copy.prepare.showTranslation}
                  </label>
                  {showTr && <p className="mt-1 text-lg">{translation}</p>}
                </>
              ) : <p>{copy.prepare.noTranslation}</p>}
            </div>
          )}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Button variant="ghost" className="min-h-14" onClick={() => onRate("dont_know")}>{copy.prepare.dontKnow}</Button>
            <Button variant="secondary" className="min-h-14" onClick={() => onRate("almost")}>{copy.prepare.almost}</Button>
            <Button className="min-h-14" onClick={() => onRate("know")}>{copy.prepare.know}</Button>
          </div>
        </>
      )}
    </>
  );
}
