import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { adminCopy } from "@/content/copy";
import type { Story } from "@/mock/types";

const createLevelVersion = vi.fn();
const adaptLevelSection = vi.fn();
// Stories come from the test data (no network): refetches after "Make" return the same list.
vi.mock("@/data/stories", async (orig) => {
  const real = await orig<typeof import("@/data/stories")>();
  const { queryOptions } = await import("@tanstack/react-query");
  return { ...real, storiesQuery: () => queryOptions({ queryKey: ["stories"], queryFn: async () => stories }) };
});
vi.mock("@/lib/levels.functions", () => ({ createLevelVersion: (a: unknown) => createLevelVersion(a), adaptLevelSection: (a: unknown) => adaptLevelSection(a), setVersionStatus: vi.fn() }));

const sec = (id: string) => ({ id, storyId: "alice", level: "B1" as const, order: 1, title: "Part 1", text: "t", cards: [] });
const stories: Story[] = [
  { id: "alice", title: "Alice in Wonderland", author: "Lewis Carroll", genre: "fantasy", blurb: "", minutes: 5, ownerId: null,
    versions: [{ id: "alice-B1", storyId: "alice", level: "B1", status: "approved", sections: [sec("alice-B1-s1")] }, { id: "alice-B2", storyId: "alice", level: "B2", status: "draft", sections: [] }] },
  { id: "own-1", title: "Private book", author: "x", genre: "mine", blurb: "", minutes: 1, ownerId: "u2", versions: [] },
];

describe("Admin: make a level with AI", () => {
  it("lists team stories only, shows missing levels, and adapts each part in turn", async () => {
    createLevelVersion.mockResolvedValue({ ok: true, versionId: "alice-A2", from: "B1", parts: [{ sectionId: "alice-A2-s1", sourceSectionId: "alice-B1-s1" }, { sectionId: "alice-A2-s2", sourceSectionId: "alice-B1-s2" }] });
    adaptLevelSection.mockResolvedValue({ ok: true, words: 80, cards: 6 });
    const { Route } = await import("@/routes/admin/stories");
    const root = createRootRoute();
    const page = createRoute({ getParentRoute: () => root, path: "/admin/stories", component: Route.options.component! });
    const review = createRoute({ getParentRoute: () => root, path: "/admin/review/$versionId", component: () => <p>review page</p> });
    const router = createRouter({ routeTree: root.addChildren([page, review]), history: createMemoryHistory({ initialEntries: ["/admin/stories"] }) });
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(["stories"], stories);
    render(<QueryClientProvider client={qc}><RouterProvider router={router} /></QueryClientProvider>);

    expect(await screen.findByText("Alice in Wonderland")).toBeInTheDocument();
    expect(screen.queryByText("Private book")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: adminCopy.stories.make("A2") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: adminCopy.stories.make("C1") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: adminCopy.stories.remake("B2") })).toBeInTheDocument(); // draft can be made again
    expect(screen.queryByRole("button", { name: adminCopy.stories.remake("B1") })).not.toBeInTheDocument(); // approved: no

    await userEvent.setup().click(screen.getByRole("button", { name: adminCopy.stories.make("A2") }));
    await waitFor(() => expect(adaptLevelSection).toHaveBeenCalledTimes(2));
    expect(createLevelVersion).toHaveBeenCalledWith({ data: { storyId: "alice", level: "A2" } });
    expect(adaptLevelSection.mock.calls.map((c) => c[0].data.sectionId)).toEqual(["alice-A2-s1", "alice-A2-s2"]);
    expect(await screen.findByText("review page")).toBeInTheDocument();
  });

  it("shows the reason when the AI step fails", async () => {
    createLevelVersion.mockResolvedValue({ ok: true, versionId: "alice-C1", from: "B2", parts: [{ sectionId: "alice-C1-s1", sourceSectionId: "alice-B1-s1" }] });
    adaptLevelSection.mockResolvedValue({ ok: false, error: "rate_limit", detail: "429" });
    const { Route } = await import("@/routes/admin/stories");
    const root = createRootRoute();
    const page = createRoute({ getParentRoute: () => root, path: "/admin/stories", component: Route.options.component! });
    const router = createRouter({ routeTree: root.addChildren([page]), history: createMemoryHistory({ initialEntries: ["/admin/stories"] }) });
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(["stories"], stories);
    render(<QueryClientProvider client={qc}><RouterProvider router={router} /></QueryClientProvider>);
    const card = (await screen.findByText("Alice in Wonderland")).closest("div")!.parentElement!;
    await userEvent.setup().click(within(card).getByRole("button", { name: adminCopy.stories.make("C1") }));
    expect(await screen.findByRole("alert")).toHaveTextContent(adminCopy.stories.errors["rate_limit"]!);
  });
});
