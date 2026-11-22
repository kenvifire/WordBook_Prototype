import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { copy } from "@/content/copy";
import { buildForm } from "@/lib/placement/scoring";
import { BANK_VERSION, GRAMMAR, WORDS } from "@/lib/placement/bank.server";

const form = buildForm(WORDS, GRAMMAR, BANK_VERSION);
const getPlacementForm = vi.fn(async () => form);
const submitPlacement = vi.fn();
vi.mock("@/lib/placement.functions", () => ({ getPlacementForm: () => getPlacementForm(), submitPlacement: (a: unknown) => submitPlacement(a) }));
vi.mock("@/data/events", () => ({ logEvent: vi.fn() }));

async function renderPlacement() {
  const { Route } = await import("@/routes/placement");
  const root = createRootRoute();
  const page = createRoute({ getParentRoute: () => root, path: "/placement", component: Route.options.component! });
  const match = createRoute({ getParentRoute: () => root, path: "/match", component: () => <p>match page</p> });
  const router = createRouter({ routeTree: root.addChildren([page, match]), history: createMemoryHistory({ initialEntries: ["/placement"] }) });
  const qc = new QueryClient();
  qc.setQueryData(["learner"], { id: "u1", consent_at: "2026-11-21", placement_level: null, first_language: "Spanish", show_translation: false });
  render(<QueryClientProvider client={qc}><RouterProvider router={router} /></QueryClientProvider>);
}

describe("Placement test screens", () => {
  beforeEach(() => { sessionStorage.clear(); submitPlacement.mockReset(); });

  it("goes through self-rating, 30 words and 8 sentences, sends one sheet and shows the level", async () => {
    submitPlacement.mockResolvedValue({ ok: true, level: "B2", assigned_level: "B2", confidence: "high" });
    await renderPlacement();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: copy.placement.start }));
    await user.click(await screen.findByRole("button", { name: copy.placement.self[2]!.label }));

    for (let i = 0; i < 30; i++) {
      expect(await screen.findByText(copy.placement.wordProgress(i + 1, 30))).toBeInTheDocument();
      if (i % 2) await user.keyboard("y"); else await user.click(screen.getByRole("button", { name: copy.placement.dontKnow }));
    }
    for (let i = 0; i < 8; i++) {
      expect(await screen.findByText(copy.placement.sentenceProgress(i + 1, 8))).toBeInTheDocument();
      if (i === 0) await user.click(screen.getByRole("button", { name: copy.placement.notSure }));
      else await user.click(screen.getByRole("button", { name: form.grammar[i]!.options[0]! }));
    }

    await waitFor(() => expect(submitPlacement).toHaveBeenCalledTimes(1));
    const sheet = submitPlacement.mock.calls[0]![0].data.sheet;
    expect(sheet.self_band).toBe("B2");
    expect(sheet.vocab).toHaveLength(30);
    expect(new Set(sheet.vocab.map((v: { item_id: string }) => v.item_id)).size).toBe(30);
    expect(sheet.vocab[1].known).toBe(true);
    expect(sheet.grammar).toHaveLength(8);
    expect(sheet.grammar[0].answer).toBeNull();
    expect(await screen.findByText(copy.placement.resultLevel("B2"))).toBeInTheDocument();
    expect(screen.getByText(copy.placement.msgSure)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: copy.placement.choose }));
    expect(await screen.findByText("match page")).toBeInTheDocument();
  });

  it("keeps answers after a reload and offers Retry if sending fails", async () => {
    submitPlacement.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce({ ok: true, level: "A2", assigned_level: "A2", confidence: "high" });
    sessionStorage.setItem("wb:placement", JSON.stringify({
      form, self: "A2", startedAt: Date.now(),
      vocab: form.vocab.map((v) => ({ item_id: v.id, known: false })),
      grammar: form.grammar.slice(0, 7).map((g) => ({ item_id: g.id, answer: null })),
    }));
    await renderPlacement();
    const user = userEvent.setup();
    expect(await screen.findByText(copy.placement.sentenceProgress(8, 8))).toBeInTheDocument(); // resumed at the last sentence
    await user.click(screen.getByRole("button", { name: copy.placement.notSure }));
    expect(await screen.findByText(copy.placement.sendError)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: copy.placement.retry }));
    expect(await screen.findByText(copy.placement.resultLevel("A2"))).toBeInTheDocument();
    expect(submitPlacement).toHaveBeenCalledTimes(2);
    expect(sessionStorage.getItem("wb:placement")).toBeNull();
  });
});
