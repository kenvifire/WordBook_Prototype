// Server only. Staff tools: make an A2/B1/B2/C1 version of a team story with AI, part by part, then approve it.
// AI versions are saved as "draft": learners see a version only after a reviewer approves it.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isLevel, nearestLevels, OWN_BOOK_MIN_CARDS } from "@/config/learning";
import type { Level } from "@/mock/types";
import { ask, makeCards } from "@/lib/own-books/ai.server";
import { acceptAdaptation, buildAdaptPrompt } from "./adapt";

export class AdaptError extends Error {
  constructor(public code: "not_staff" | "not_found" | "exists_approved" | "no_source" | "ai_rejected" | "save_failed", public detail = "") { super(code); }
}

export async function requireStaff(userId: string) {
  const { data, error } = await supabaseAdmin.rpc("is_staff", { _user_id: userId });
  if (error || data !== true) throw new AdaptError("not_staff");
}

type VersionRow = { id: string; level: string; status: string; sections: { id: string; position: number; title: string; text: string }[] };

// Creates an empty draft version (parts copied from the closest approved level). The browser then adapts each part.
export async function createLevelVersion(storyId: string, level: Level) {
  const { data: story, error } = await supabaseAdmin.from("stories")
    .select("id,owner_id,story_versions(id,level,status,sections(id,position,title,text))").eq("id", storyId).maybeSingle();
  if (error) throw new AdaptError("save_failed", error.message);
  if (!story || story.owner_id) throw new AdaptError("not_found");
  const versions = (story.story_versions ?? []) as unknown as VersionRow[];

  const existing = versions.find((v) => v.level === level);
  if (existing?.status === "approved") throw new AdaptError("exists_approved");

  const byLevel = (l: Level, approvedOnly: boolean) => versions.find((v) => v.level === l && (!approvedOnly || v.status === "approved") && v.sections.length);
  const source = nearestLevels(level).map((l) => byLevel(l, true)).find(Boolean) ?? nearestLevels(level).map((l) => byLevel(l, false)).find(Boolean);
  if (!source || !isLevel(source.level)) throw new AdaptError("no_source");

  if (existing) { // "Make again": drop the old draft (its parts and cards go with it)
    const d = await supabaseAdmin.from("story_versions").delete().eq("id", existing.id);
    if (d.error) throw new AdaptError("save_failed", d.error.message);
  }
  const versionId = `${storyId}-${level}`;
  const v = await supabaseAdmin.from("story_versions").insert({ id: versionId, story_id: storyId, level, status: "draft", prompt_version: `level-adapt-v1 from ${source.level}`, change_log: `AI adaptation from ${source.id}` });
  if (v.error) throw new AdaptError("save_failed", v.error.message);
  const parts = [...source.sections].sort((a, b) => a.position - b.position);
  const rows = parts.map((p) => ({ id: `${versionId}-s${p.position}`, version_id: versionId, position: p.position, title: p.title, text: p.text }));
  const s = await supabaseAdmin.from("sections").insert(rows);
  if (s.error) { await supabaseAdmin.from("story_versions").delete().eq("id", versionId); throw new AdaptError("save_failed", s.error.message); }
  return { versionId, from: source.level as Level, parts: rows.map((r, i) => ({ sectionId: r.id, sourceSectionId: parts[i]!.id })) };
}

// Adapts one part with AI and makes its word cards. Safe to run again on the same part.
export async function adaptSection(sectionId: string, sourceSectionId: string) {
  const started = Date.now();
  const { data: target } = await supabaseAdmin.from("sections").select("id,version_id,story_versions!inner(level,status,stories!inner(title,author,owner_id))").eq("id", sectionId).maybeSingle();
  const { data: source } = await supabaseAdmin.from("sections").select("id,text,story_versions!inner(level)").eq("id", sourceSectionId).maybeSingle();
  const tv = (target as unknown as { story_versions: { level: string; status: string; stories: { title: string; author: string; owner_id: string | null } } } | null)?.story_versions;
  const sv = (source as unknown as { story_versions: { level: string } } | null)?.story_versions;
  if (!target || !source || !tv || !sv || tv.stories.owner_id || !isLevel(tv.level) || !isLevel(sv.level)) throw new AdaptError("not_found");
  if (tv.status === "approved") throw new AdaptError("exists_approved");

  const prompt = buildAdaptPrompt({ text: source.text, from: sv.level, to: tv.level, title: tv.stories.title, author: tv.stories.author });
  let text: string | null = null;
  let tries = 0;
  while (!text && tries < 2) { tries++; text = acceptAdaptation(source.text, await ask(prompt), tv.level); }
  if (!text) throw new AdaptError("ai_rejected", "the AI answer was empty or too long/short twice");

  const up = await supabaseAdmin.from("sections").update({ text }).eq("id", sectionId);
  if (up.error) throw new AdaptError("save_failed", up.error.message);

  // Cards: words from other parts of this version are not asked again.
  const { data: others } = await supabaseAdmin.from("cards").select("lemma,sections!inner(version_id)").eq("sections.version_id", target.version_id).neq("section_id", sectionId);
  const cards = await makeCards({ passage: text, level: tv.level, translationLanguage: null, minCards: OWN_BOOK_MIN_CARDS, avoid: (others ?? []).map((c) => (c as { lemma: string }).lemma) });
  await supabaseAdmin.from("cards").delete().eq("section_id", sectionId);
  const ins = await supabaseAdmin.from("cards").insert(cards.map((c, i) => ({ id: `${sectionId}-c${i + 1}`, section_id: sectionId, lemma: c.word, definition: c.definition, example: c.example, confidence: null })));
  if (ins.error) throw new AdaptError("save_failed", ins.error.message);

  await supabaseAdmin.from("adaptation_runs").insert({
    version_id: target.version_id, latency_ms: Date.now() - started, retries: tries - 1,
    gates_json: { section_id: sectionId, from: sv.level, to: tv.level, words_before: source.text.split(/\s+/).length, words_after: text.split(/\s+/).length, cards: cards.length },
  });
  return { words: text.split(/\s+/).length, cards: cards.length };
}

// Approve (learners can see it) or send back (draft). Only one approved version per story and level.
export async function setVersionStatus(userId: string, versionId: string, status: "approved" | "draft") {
  const { data: v } = await supabaseAdmin.from("story_versions").select("id,story_id,level,stories!inner(owner_id)").eq("id", versionId).maybeSingle();
  if (!v || (v as unknown as { stories: { owner_id: string | null } }).stories.owner_id) throw new AdaptError("not_found");
  if (status === "approved") {
    const d = await supabaseAdmin.from("story_versions").update({ status: "draft" }).eq("story_id", v.story_id).eq("level", v.level).eq("status", "approved").neq("id", versionId);
    if (d.error) throw new AdaptError("save_failed", d.error.message);
  }
  const u = await supabaseAdmin.from("story_versions").update({ status, reviewer: userId }).eq("id", versionId);
  if (u.error) throw new AdaptError("save_failed", u.error.message);
}
