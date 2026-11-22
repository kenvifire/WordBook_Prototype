// Server only. Saves uploaded books and their AI-made cards with the admin client.
// Every function checks that the signed-in learner owns the book before writing.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { DEFAULT_LEVEL, isLevel, OWN_BOOK_MAX_WORDS, OWN_BOOK_MIN_CARDS, OWN_BOOK_MIN_WORDS } from "@/config/learning";
import { countWords, normalizeText, sectionize } from "./sectionize";
import { cleanOcrText, makeCards } from "./ai.server";
import { topUpCards } from "./cards";
import { looksLikeOcr } from "./pdf-text";

export type CreateOwnBookInput = { title: string; author: string; text: string; format: "pdf" | "epub" | "txt"; rightsConfirmed: true };

export class OwnBookError extends Error {
  constructor(public code: "invalid" | "too_short" | "too_long" | "not_found" | "save_failed", public detail = "") { super(code); }
}

// Translation languages the cards can use (the consent screen list, without "Other").
const TRANSLATABLE = new Set(["Spanish", "Portuguese", "French", "Chinese", "Polish", "Arabic"]);

export function validateCreateInput(raw: unknown): CreateOwnBookInput {
  const o = (raw ?? {}) as Record<string, unknown>;
  const title = typeof o["title"] === "string" ? o["title"].replace(/\s+/g, " ").trim() : "";
  const author = typeof o["author"] === "string" ? o["author"].replace(/\s+/g, " ").trim() : "";
  const text = typeof o["text"] === "string" ? o["text"] : "";
  const format = o["format"];
  if (!title || title.length > 150 || author.length > 120 || o["rightsConfirmed"] !== true) throw new OwnBookError("invalid");
  if (format !== "pdf" && format !== "epub" && format !== "txt") throw new OwnBookError("invalid");
  return { title, author, text, format, rightsConfirmed: true };
}

async function learnerProfile(userId: string) {
  const { data } = await supabaseAdmin.from("learners").select("placement_level,first_language").eq("id", userId).maybeSingle();
  const level = isLevel(data?.placement_level) ? data.placement_level : DEFAULT_LEVEL;
  const lang = data?.first_language && TRANSLATABLE.has(data.first_language) ? data.first_language : null;
  return { level, lang };
}

async function logEvent(userId: string, type: string, entity: string, payload: Record<string, string | number | boolean | null>) {
  const { error } = await supabaseAdmin.from("events").insert({ learner_id: userId, type, entity, payload });
  if (error) console.error("[own-books] event not saved", type, error.message);
}

const OCR_VERSION = "own-book-v1+ocr-cleanup";

export async function createOwnBook(userId: string, input: CreateOwnBookInput) {
  const text = normalizeText(input.text);
  const words = countWords(text);
  if (words < OWN_BOOK_MIN_WORDS) throw new OwnBookError("too_short");
  if (words > OWN_BOOK_MAX_WORDS) throw new OwnBookError("too_long");
  const parts = sectionize(text);
  const { level } = await learnerProfile(userId);

  const storyId = `own-${crypto.randomUUID().slice(0, 12)}`;
  const versionId = `${storyId}-v1`;
  const blurbWords = text.replace(/\s+/g, " ").split(" ");
  const blurb = blurbWords.slice(0, 25).join(" ") + (blurbWords.length > 25 ? "…" : "");

  const fail = async (msg: string) => {
    console.error("[own-books] save failed", msg);
    await supabaseAdmin.from("stories").delete().eq("id", storyId).eq("owner_id", userId);
    throw new OwnBookError("save_failed", msg);
  };

  const s = await supabaseAdmin.from("stories").insert({
    id: storyId, title: input.title, author: input.author || "Unknown", genre: "mine", blurb,
    minutes: Math.max(1, Math.round(words / 120)), source: `Uploaded by the learner (${input.format.toUpperCase()})`,
    license: "Learner's own copy. Private to this learner.", pd_us: false, pd_mx: false, owner_id: userId,
  });
  if (s.error) await fail(s.error.message);
  // Scanned PDFs (OCR) get an AI clean-up of each part before its cards are made.
  const promptVersion = input.format === "pdf" && looksLikeOcr(text) ? OCR_VERSION : "own-book-v1";
  const v = await supabaseAdmin.from("story_versions").insert({ id: versionId, story_id: storyId, level, status: "auto", prompt_version: promptVersion });
  if (v.error) await fail(v.error.message);
  const rows = parts.map((p) => ({ id: `${storyId}-s${p.position}`, version_id: versionId, position: p.position, title: p.title, text: p.text }));
  for (let i = 0; i < rows.length; i += 200) {
    const r = await supabaseAdmin.from("sections").insert(rows.slice(i, i + 200));
    if (r.error) await fail(r.error.message);
  }
  await logEvent(userId, "own_book_added", storyId, { format: input.format, words, sections: rows.length });

  // Cards for the first part now, so the learner can start at once. Later parts get cards when opened.
  let firstPartReady = true;
  try { await ensureSectionCards(userId, rows[0]!.id); } catch (e) { firstPartReady = false; console.error("[own-books] first cards failed", e); }
  return { storyId, sections: rows.length, firstPartReady };
}

// Makes cards for a part if it has none yet. Safe to call twice.
export async function ensureSectionCards(userId: string, sectionId: string) {
  const { data: sec, error } = await supabaseAdmin
    .from("sections").select("id,text,story_versions!inner(level,prompt_version,stories!inner(owner_id))").eq("id", sectionId).maybeSingle();
  if (error) throw new OwnBookError("save_failed", `read section: ${error.message}`);
  const owner = (sec as unknown as { story_versions: { level: string; prompt_version: string | null; stories: { owner_id: string | null } } } | null)?.story_versions;
  if (!sec || owner?.stories.owner_id !== userId) throw new OwnBookError("not_found");

  const existing = await supabaseAdmin.from("cards").select("id", { count: "exact", head: true }).eq("section_id", sectionId);
  if ((existing.count ?? 0) > 0) return { created: 0 };

  const { lang } = await learnerProfile(userId);
  const started = Date.now();
  let passage = sec.text;
  if (owner.prompt_version === OCR_VERSION) {
    const cleaned = await cleanOcrText(passage).catch((e) => { console.error("[own-books] OCR clean-up failed", e); return null; });
    if (cleaned && cleaned !== passage) {
      const u = await supabaseAdmin.from("sections").update({ text: cleaned }).eq("id", sectionId);
      if (u.error) console.error("[own-books] cleaned text not saved", u.error.message);
      else { passage = cleaned; await logEvent(userId, "own_book_text_cleaned", sectionId, { words_before: countWords(sec.text), words_after: countWords(cleaned) }); }
    }
  }
  // Words that already have cards in other parts of this book: not asked again, used only to top up a short part.
  const versionId = (await supabaseAdmin.from("sections").select("version_id").eq("id", sectionId).maybeSingle()).data?.version_id;
  const { data: bookCards } = versionId
    ? await supabaseAdmin.from("cards").select("lemma,definition,sections!inner(version_id)").eq("sections.version_id", versionId)
    : { data: [] as { lemma: string; definition: string }[] };
  const known = (bookCards ?? []) as { lemma: string; definition: string }[];
  const fresh = await makeCards({ passage, level: owner.level, translationLanguage: lang, minCards: OWN_BOOK_MIN_CARDS, avoid: known.map((c) => c.lemma) });
  const cards = topUpCards(fresh, known, passage, OWN_BOOK_MIN_CARDS);

  const again = await supabaseAdmin.from("cards").select("id", { count: "exact", head: true }).eq("section_id", sectionId);
  if ((again.count ?? 0) > 0) return { created: 0 }; // another request finished first

  const cardRows = cards.map((c, i) => ({ id: `${sectionId}-c${i + 1}`, section_id: sectionId, lemma: c.word, definition: c.definition, example: c.example, confidence: null }));
  const ins = await supabaseAdmin.from("cards").upsert(cardRows, { onConflict: "id", ignoreDuplicates: true });
  if (ins.error) throw new OwnBookError("save_failed", `save cards: ${ins.error.message}`);
  const tr = lang ? cards.flatMap((c, i) => (c.translation ? [{ card_id: cardRows[i]!.id, lang, text: c.translation }] : [])) : [];
  if (tr.length) {
    const t = await supabaseAdmin.from("card_translations").upsert(tr, { onConflict: "card_id,lang", ignoreDuplicates: true });
    if (t.error) console.error("[own-books] translations not saved", t.error.message);
  }
  await logEvent(userId, "own_book_cards_made", sectionId, { cards: cardRows.length, ms: Date.now() - started });
  return { created: cardRows.length };
}

export async function deleteOwnBook(userId: string, storyId: string) {
  const { error, count } = await supabaseAdmin.from("stories").delete({ count: "exact" }).eq("id", storyId).eq("owner_id", userId);
  if (error) throw new OwnBookError("save_failed", error.message);
  if (!count) throw new OwnBookError("not_found");
  await logEvent(userId, "own_book_deleted", storyId, {});
}
