import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Learner's own books. The browser sends plain text (files are read on the device).
// Server modules are imported inside handlers so they never reach the browser bundle.

// Error codes the screens turn into simple messages (see copy.ownBooks.errors).
export type OwnBookErrorCode = "invalid" | "too_short" | "too_long" | "not_found" | "save_failed" | "no_key" | "rate_limit" | "no_credits" | "failed" | "too_few";

function codeOf(e: unknown): OwnBookErrorCode {
  const c = (e as { code?: unknown })?.code;
  return typeof c === "string" ? (c as OwnBookErrorCode) : "failed";
}

// Short technical reason, shown in small text so the team can fix problems during the pilot.
// Never contains keys: only status codes and provider/database messages.
function detailOf(e: unknown): string {
  const o = e as { detail?: unknown; message?: unknown };
  const d = typeof o?.detail === "string" && o.detail ? o.detail : typeof o?.message === "string" ? o.message : String(e);
  if (!(e as { code?: unknown })?.code) console.error("[own-books] unexpected error", d);
  return d.slice(0, 600);
}

export const createOwnBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => d)
  .handler(async ({ context, data }) => {
    const svc = await import("@/lib/own-books/service.server");
    try {
      const input = svc.validateCreateInput(data);
      return { ok: true as const, ...(await svc.createOwnBook(context.userId, input)) };
    } catch (e) {
      return { ok: false as const, error: codeOf(e), detail: detailOf(e) };
    }
  });

export const makeSectionCards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { sectionId: string }) => {
    if (!d || typeof d.sectionId !== "string" || d.sectionId.length > 120) throw new Error("Bad input.");
    return { sectionId: d.sectionId };
  })
  .handler(async ({ context, data }) => {
    const svc = await import("@/lib/own-books/service.server");
    try {
      return { ok: true as const, ...(await svc.ensureSectionCards(context.userId, data.sectionId)) };
    } catch (e) {
      return { ok: false as const, error: codeOf(e), detail: detailOf(e) };
    }
  });

export const removeOwnBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { storyId: string }) => {
    if (!d || typeof d.storyId !== "string" || !d.storyId.startsWith("own-")) throw new Error("Bad input.");
    return { storyId: d.storyId };
  })
  .handler(async ({ context, data }) => {
    const svc = await import("@/lib/own-books/service.server");
    try {
      await svc.deleteOwnBook(context.userId, data.storyId);
      return { ok: true as const };
    } catch (e) {
      return { ok: false as const, error: codeOf(e), detail: detailOf(e) };
    }
  });
