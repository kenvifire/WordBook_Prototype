import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isLevel } from "@/config/learning";

// Staff tools for level versions of team stories (AI adaptation + review).
// Server modules are imported inside handlers so they never reach the browser bundle.

const fail = (e: unknown) => {
  const o = e as { code?: unknown; detail?: unknown; message?: unknown };
  const code = typeof o?.code === "string" ? o.code : "failed";
  const detail = typeof o?.detail === "string" && o.detail ? o.detail : typeof o?.message === "string" ? o.message : "";
  if (code === "failed") console.error("[levels] unexpected error", detail);
  return { ok: false as const, error: code, detail: detail.slice(0, 400) };
};

export const createLevelVersion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { storyId: string; level: string }) => {
    if (!d || typeof d.storyId !== "string" || !isLevel(d.level)) throw new Error("Bad input.");
    return { storyId: d.storyId, level: d.level };
  })
  .handler(async ({ context, data }) => {
    const svc = await import("@/lib/adapt/service.server");
    try {
      await svc.requireStaff(context.userId);
      return { ok: true as const, ...(await svc.createLevelVersion(data.storyId, data.level)) };
    } catch (e) { return fail(e); }
  });

export const adaptLevelSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { sectionId: string; sourceSectionId: string }) => {
    if (!d || typeof d.sectionId !== "string" || typeof d.sourceSectionId !== "string") throw new Error("Bad input.");
    return { sectionId: d.sectionId, sourceSectionId: d.sourceSectionId };
  })
  .handler(async ({ context, data }) => {
    const svc = await import("@/lib/adapt/service.server");
    try {
      await svc.requireStaff(context.userId);
      return { ok: true as const, ...(await svc.adaptSection(data.sectionId, data.sourceSectionId)) };
    } catch (e) { return fail(e); }
  });

export const setVersionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { versionId: string; status: "approved" | "draft" }) => {
    if (!d || typeof d.versionId !== "string" || (d.status !== "approved" && d.status !== "draft")) throw new Error("Bad input.");
    return { versionId: d.versionId, status: d.status };
  })
  .handler(async ({ context, data }) => {
    const svc = await import("@/lib/adapt/service.server");
    try {
      await svc.requireStaff(context.userId);
      await svc.setVersionStatus(context.userId, data.versionId, data.status);
      return { ok: true as const };
    } catch (e) { return fail(e); }
  });
