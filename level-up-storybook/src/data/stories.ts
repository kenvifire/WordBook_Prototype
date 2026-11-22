import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { nearestLevels } from "@/config/learning";
import type { Genre, Level, Section, Story, StoryVersion, WordCard } from "@/mock/types";

export type { Genre, Level, Section, Story, StoryVersion, WordCard };

const SELECT = "id,title,author,genre,blurb,minutes,content_note,source,license,owner_id,story_versions(id,story_id,level,status,sections(id,position,title,text,cards(id,lemma,definition,example,card_translations(lang,text))))";

type CardRow = { id: string; lemma: string; definition: string; example: string | null; card_translations: { lang: string; text: string }[] };
type SectionRow = { id: string; position: number; title: string; text: string; cards: CardRow[] };
type VersionRow = { id: string; story_id: string; level: string; status: StoryVersion["status"]; sections: SectionRow[] };
type StoryRow = { id: string; title: string; author: string; genre: string; blurb: string | null; minutes: number | null; content_note: string | null; source: string | null; license: string | null; owner_id: string | null; story_versions: VersionRow[] };

// One card per word in a section, even if the same word was saved twice.
const uniqueWords = (cards: CardRow[]) => { const seen = new Set<string>(); return cards.filter((c) => { const k = c.lemma.trim().toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }); };

const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id, undefined, { numeric: true });

function toStory(r: StoryRow): Story {
  return {
    id: r.id, title: r.title, author: r.author, genre: r.genre as Genre, blurb: r.blurb ?? "", minutes: r.minutes ?? 0, contentNote: r.content_note ?? "", source: r.source ?? "", license: r.license ?? "", ownerId: r.owner_id,
    versions: [...r.story_versions].sort((a, b) => a.level.localeCompare(b.level)).map((v) => ({
      id: v.id, storyId: v.story_id, level: v.level as Level, status: v.status,
      sections: [...v.sections].sort((a, b) => a.position - b.position).map((s) => ({
        id: s.id, storyId: v.story_id, level: v.level as Level, order: s.position, title: s.title, text: s.text,
        cards: uniqueWords([...s.cards].sort(byId)).map((c) => ({ id: c.id, word: c.lemma, meaning: c.definition, example: c.example ?? "", translations: Object.fromEntries((c.card_translations ?? []).map((t) => [t.lang, t.text])) })),
      })),
    })),
  };
}

async function fetchStories(): Promise<Story[]> {
  const { data, error } = await supabase.from("stories").select(SELECT).order("title");
  if (error) throw new Error(error.message);
  return (data as unknown as StoryRow[]).map(toStory);
}

// Learners only receive approved versions (enforced by access rules); staff receive all.
export const storiesQuery = () => queryOptions({ queryKey: ["stories"], queryFn: fetchStories });

export const findStory = (all: Story[], id: string) => all.find((s) => s.id === id);
export const findVersion = (all: Story[], id: string) => all.flatMap((s) => s.versions).find((v) => v.id === id);
export const findSection = (all: Story[], id: string) => all.flatMap((s) => s.versions.flatMap((v) => v.sections)).find((s) => s.id === id);

export async function logLookup(lemma: string, sectionId: string, cardId?: string) {
  await supabase.from("lookups").insert({ lemma, section_id: sectionId } as never);
  // A tapped word joins the review queue (due now) unless the learner already has it.
  const { data: u } = await supabase.auth.getUser();
  if (cardId && u.user) await supabase.from("card_progress").upsert({ learner_id: u.user.id, card_id: cardId, box: 0, lapses: 0, due: new Date().toISOString(), origin: "tap" }, { onConflict: "learner_id,card_id", ignoreDuplicates: true });
  await supabase.from("events").insert({ type: "lookup", entity: sectionId, payload: { lemma } } as never);
}

// Reading speed used for every reading-time estimate. Change it here only.
export const WORDS_PER_MINUTE = 120;
export const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
export const readingMinutes = (v: StoryVersion) =>
  Math.max(1, Math.ceil(v.sections.reduce((n, s) => n + countWords(s.text), 0) / WORDS_PER_MINUTE));

// Only approved versions are shown to learners (also enforced by access rules).
export const approvedVersion = (s: Story, level: Level) => s.versions.find((v) => v.level === level && v.status === "approved");

// The approved version at this level, or else at the closest level that has one (A2 → B1 → B2…).
export function closestApprovedVersion(s: Story, level: Level): { v: StoryVersion; exact: boolean } | undefined {
  const exact = approvedVersion(s, level);
  if (exact) return { v: exact, exact: true };
  for (const l of nearestLevels(level)) { const v = approvedVersion(s, l); if (v) return { v, exact: false }; }
  return undefined;
}

// A book the learner uploaded: private to them, one version made for their level, cards made by AI.
export const isOwnBook = (s: Pick<Story, "ownerId">) => !!s.ownerId;
// The version a learner reads: their own book's only version, or the approved version at this level
// (or at the closest level when this one is not ready yet).
export const visibleVersion = (s: Story, level: Level) => (isOwnBook(s) ? s.versions[0] : closestApprovedVersion(s, level)?.v);

// Section ids this learner has unlocked (a section_attempts row with unlocked_at set).
async function fetchUnlocked(): Promise<string[]> {
  const { data, error } = await supabase.from("section_attempts").select("section_id").not("unlocked_at", "is", null);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.section_id);
}
export const unlockedQuery = () => queryOptions({ queryKey: ["unlocked-sections"], queryFn: fetchUnlocked });

// Section 1 is always open; a later section opens when the previous one was unlocked.
export const isSectionOpen = (sections: Section[], index: number, unlocked: string[]) =>
  index === 0 || unlocked.includes(sections[index - 1]!.id);

// A translation is shown only when one exists in the learner's first language.
export const translationFor = (card: Pick<WordCard, "translations">, firstLanguage: string | null | undefined) =>
  (firstLanguage && card.translations?.[firstLanguage]) || null;
