// Prompt and answer checks for AI-made word cards (books a learner uploads).
// Pure functions: no network, easy to test.

export type AiCard = { word: string; definition: string; example: string; translation: string | null };

export type CardPromptInput = { passage: string; level: string; count: number; translationLanguage: string | null; avoid?: string[] };

// How many cards to ask for: fewer for short parts (never fewer than the quiz needs).
export function cardTarget(passageWords: number, max: number, min: number, wordsPerCard: number): number {
  return Math.max(min, Math.min(max, Math.round(passageWords / wordsPerCard)));
}

// "frightened", "frightening" and "frighten" count as one word family.
export function wordFamily(word: string): string {
  const w = word.toLowerCase().replace(/[’']s$/, "").replace(/(..)ie[sd]$/, "$1y"); // stories, carried → story, carry
  for (const suf of ["ingly", "edly", "ings", "ing", "ness", "ment", "ers", "est", "ly", "ed", "er", "es", "s"]) {
    if (w.length - suf.length >= 4 && w.endsWith(suf)) return w.slice(0, -suf.length).replace(/(.)\1$/, "$1").replace(/i$/, "y").replace(/e$/, "");
  }
  return w.replace(/e$/, "");
}

export function buildCardPrompt({ passage, level, count, translationLanguage, avoid = [] }: CardPromptInput): string {
  const tr = translationLanguage
    ? `"translation": the word's meaning in ${translationLanguage} (1 to 4 words).`
    : `"translation": null.`;
  return [
    `You help adult learners of English at level ${level} (CEFR) read real books.`,
    `From the passage below, choose UP TO ${count} words a ${level} learner most needs to know before reading it.`,
    "If the passage has fewer useful words, return fewer (at least 4). Never repeat a word, and never give two forms of the same word (like \"frighten\" and \"frightened\").",
    ...(avoid.length ? [`The learner already has cards for these words from other parts of this book. Do not choose them or their other forms: ${avoid.slice(0, 300).join(", ")}.`] : []),
    "Rules:",
    "- Pick words that matter for understanding the passage. Skip very common words (the 2000 most frequent), names of people and places, and numbers.",
    "- Single words only (no phrases). Each word must appear in the passage. Write it exactly as it appears (same form and spelling), in lowercase unless it is always written with a capital.",
    "- No repeated words. Every definition must be different from the others.",
    "- \"definition\": the meaning in this passage, in very simple English (A2), 3 to 12 words, without using the word itself.",
    "- \"example\": copy the full sentence from the passage that contains the word (max 30 words; cut it shorter around the word if needed).",
    `- ${tr}`,
    'Answer with JSON only, no other text: {"cards":[{"word":"...","definition":"...","example":"...","translation":...}]}',
    "",
    "PASSAGE:",
    passage,
  ].join("\n");
}

function stripFence(s: string): string {
  const t = s.trim();
  const m = t.match(/^```[a-zA-Z]*\s*([\s\S]*?)\s*```$/);
  return m ? m[1]! : t;
}

// Finds the outer JSON object even when the model adds text around it.
function extractJson(s: string): unknown {
  const t = stripFence(s);
  try { return JSON.parse(t); } catch { /* fall through */ }
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch { /* fall through */ } }
  return null;
}

const str = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Keeps only cards that are safe to show: the word is in the passage, the definition is
// short and unique, no duplicates. Returns at most `max` cards in passage order.
export function parseCardsResponse(raw: string, passage: string, max: number, avoid: string[] = []): AiCard[] {
  const json = extractJson(raw) as { cards?: unknown } | unknown[] | null;
  const list = Array.isArray(json) ? json : Array.isArray((json as { cards?: unknown })?.cards) ? ((json as { cards: unknown[] }).cards) : [];
  const lowerPassage = passage.toLowerCase();
  const seenWords = new Set<string>(avoid.map(wordFamily));
  const seenDefs = new Set<string>();
  const out: { card: AiCard; at: number }[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const word = str(o["word"]);
    const definition = str(o["definition"]).replace(/\.$/, "");
    let example = str(o["example"]);
    const translation = str(o["translation"]) || null;
    if (!word || !definition || word.length > 40 || definition.length > 140) continue;
    if (/[^a-zA-Z']/.test(word)) continue; // single words only (the reader taps one word)
    const key = word.toLowerCase();
    const family = wordFamily(key);
    const at = lowerPassage.search(new RegExp(`(^|[^a-z'])${escapeRe(key)}($|[^a-z'])`));
    if (at < 0) continue; // not in this passage
    if (seenWords.has(family) || seenDefs.has(definition.toLowerCase())) continue;
    if (!example || !example.toLowerCase().includes(key)) example = sentenceWith(passage, key);
    seenWords.add(family); seenDefs.add(definition.toLowerCase());
    out.push({ card: { word: key, definition, example, translation }, at });
  }
  return out.sort((x, y) => x.at - y.at).slice(0, max).map((x) => x.card);
}

// The sentence of the passage that contains the word (fallback when the AI example is missing).
export function sentenceWith(passage: string, word: string): string {
  const sentences = passage.replace(/\s+/g, " ").match(/[^.!?]+[.!?]+["'”’)\]]*|[^.!?]+$/g) ?? [passage];
  const s = sentences.find((x) => x.toLowerCase().includes(word.toLowerCase())) ?? "";
  const w = s.trim().split(" ");
  return w.length <= 30 ? s.trim() : w.slice(0, 30).join(" ") + "…";
}

// A short part may have fewer than `min` new words. Then reuse words from earlier parts
// that also appear in this part (same meaning, example from this part), so the quiz can run.
export function topUpCards(fresh: AiCard[], known: { lemma: string; definition: string }[], passage: string, min: number): AiCard[] {
  if (fresh.length >= min) return fresh;
  const out = [...fresh];
  const used = new Set(out.map((c) => wordFamily(c.word)));
  const lower = passage.toLowerCase();
  for (const k of known) {
    if (out.length >= min) break;
    const word = k.lemma.toLowerCase();
    if (used.has(wordFamily(word))) continue;
    if (!new RegExp(`(^|[^a-z'])${escapeRe(word)}($|[^a-z'])`).test(lower)) continue;
    out.push({ word, definition: k.definition, example: sentenceWith(passage, word), translation: null });
    used.add(wordFamily(word));
  }
  return out;
}
