// Server only: calls Lovable AI to make word cards for one part of an uploaded book.
import { chat } from "@tanstack/ai";
import { createLovableText } from "@tanstack/ai-lovable";
import { OWN_BOOK_AI_FALLBACK_MODEL, OWN_BOOK_AI_MODEL, OWN_BOOK_CARDS_PER_SECTION, OWN_BOOK_WORDS_PER_CARD } from "@/config/learning";
import { buildCardPrompt, cardTarget, parseCardsResponse, type AiCard } from "./cards";
import { acceptCleanup, buildCleanupPrompt } from "./ocr-cleanup";

export class AiError extends Error {
  constructor(public code: "no_key" | "rate_limit" | "no_credits" | "failed" | "too_few", public detail = "") { super(code); }
}

type Route = { model: typeof OWN_BOOK_AI_MODEL | typeof OWN_BOOK_AI_FALLBACK_MODEL; api: "chat" | "responses" };

// Tried in order until one answers. Chat Completions first: every gateway model supports it.
export const AI_ROUTES: Route[] = [
  { model: OWN_BOOK_AI_MODEL, api: "chat" },
  { model: OWN_BOOK_AI_MODEL, api: "responses" },
  { model: OWN_BOOK_AI_FALLBACK_MODEL, api: "chat" },
];

const describeError = (e: unknown) => {
  const o = e as { status?: unknown; message?: unknown; error?: { message?: unknown } };
  const status = typeof o?.status === "number" ? `${o.status} ` : "";
  const msg = typeof o?.message === "string" ? o.message : typeof o?.error?.message === "string" ? o.error.message : String(e);
  return (status + msg).replace(/\s+/g, " ").slice(0, 300);
};

async function askOnce(route: Route, key: string, prompt: string): Promise<string> {
  const adapter = route.api === "chat" ? createLovableText(route.model, key, { api: "chat" }) : createLovableText(route.model, key);
  const { text } = await chat({
    adapter,
    messages: [{ role: "user", content: prompt }],
    threadId: `own-book-cards-${crypto.randomUUID()}`,
    stream: false,
  });
  if (!text?.trim()) throw new Error("empty answer");
  return text;
}

// Sends one prompt to Lovable AI (with fallbacks) and returns the text answer.
export async function ask(prompt: string): Promise<string> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new AiError("no_key", "LOVABLE_API_KEY is not set");
  const problems: string[] = [];
  for (const route of AI_ROUTES) {
    try {
      return await askOnce(route, key, prompt);
    } catch (e) {
      const d = describeError(e);
      if (/\b429\b|rate limit/i.test(d)) throw new AiError("rate_limit", d);
      if (/\b402\b|payment required/i.test(d)) throw new AiError("no_credits", d);
      problems.push(`${route.model} (${route.api}): ${d}`);
      console.error("[own-books] AI call failed", route.model, route.api, d);
    }
  }
  throw new AiError("failed", problems.join(" | ").slice(0, 600));
}

// One retry when the answer is unusable (bad JSON or too few valid words).
// Returns what it found (maybe fewer than minCards: the caller can top up); throws only when nothing is usable.
// Short parts get fewer cards; words that already have cards in this book are skipped.
export async function makeCards(input: { passage: string; level: string; translationLanguage: string | null; minCards: number; avoid?: string[] }): Promise<AiCard[]> {
  const avoid = input.avoid ?? [];
  const target = cardTarget(input.passage.split(/\s+/).filter(Boolean).length, OWN_BOOK_CARDS_PER_SECTION, input.minCards, OWN_BOOK_WORDS_PER_CARD);
  const prompt = buildCardPrompt({ passage: input.passage, level: input.level, count: target, translationLanguage: input.translationLanguage, avoid });
  let best: AiCard[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await ask(prompt);
    const cards = parseCardsResponse(raw, input.passage, target, avoid);
    if (cards.length > best.length) best = cards;
    if (best.length >= input.minCards) return best;
    console.error("[own-books] AI answer had too few valid cards", cards.length, raw.slice(0, 300));
  }
  if (best.length) return best;
  throw new AiError("too_few", "no valid cards");
}

// Fixes OCR errors in one part of a scanned book. Returns null when the AI answer is not a safe correction.
export async function cleanOcrText(text: string): Promise<string | null> {
  const answer = await ask(buildCleanupPrompt(text));
  const cleaned = acceptCleanup(text, answer);
  if (!cleaned) console.error("[own-books] OCR clean-up answer rejected", answer.slice(0, 200));
  return cleaned;
}
