import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, createRootRoute, createRoute, createRouter, rootRouteId, RouterProvider } from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { copy } from "@/content/copy";

const createOwnBook = vi.fn();
vi.mock("@/lib/own-books.functions", () => ({ createOwnBook: (a: unknown) => createOwnBook(a) }));
vi.mock("@/data/events", () => ({ logEvent: vi.fn() }));

describe("Add your book", () => {
  it("has a page at /add-book", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes("/add-book").at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("reads a TXT file, shows its size, and sends title, author and text", async () => {
    const { Route } = await import("@/routes/_learner.add-book");
    const root = createRootRoute();
    const page = createRoute({ getParentRoute: () => root, path: "/add-book", component: Route.options.component! });
    const story = createRoute({ getParentRoute: () => root, path: "/story/$id", component: () => <p>story page</p> });
    const router = createRouter({ routeTree: root.addChildren([page, story]), history: createMemoryHistory({ initialEntries: ["/add-book"] }) });
    createOwnBook.mockResolvedValue({ ok: true, storyId: "own-abc", sections: 2, firstPartReady: true });
    render(<QueryClientProvider client={new QueryClient()}><RouterProvider router={router} /></QueryClientProvider>);

    const text = Array.from({ length: 30 }, (_, i) => `Paragraph ${i} has some words in it to read.`).join("\n\n");
    const file = new File([text], "the_canterville_ghost.txt", { type: "text/plain" });
    const user = userEvent.setup();
    await user.upload(await screen.findByLabelText(copy.ownBooks.file), file);

    expect(await screen.findByText(/270 words · 1 parts/)).toBeInTheDocument();
    expect(screen.getByLabelText(copy.ownBooks.titleLabel)).toHaveValue("the canterville ghost");
    const submit = screen.getByRole("button", { name: copy.ownBooks.button });
    expect(submit).toBeDisabled(); // rights not confirmed yet

    await user.clear(screen.getByLabelText(copy.ownBooks.titleLabel));
    await user.type(screen.getByLabelText(copy.ownBooks.titleLabel), "The Canterville Ghost");
    await user.type(screen.getByLabelText(copy.ownBooks.author), "Oscar Wilde");
    await user.click(screen.getByLabelText(copy.ownBooks.rights));
    await user.click(submit);

    await waitFor(() => expect(createOwnBook).toHaveBeenCalledTimes(1));
    expect(createOwnBook.mock.calls[0]![0]).toEqual({ data: { title: "The Canterville Ghost", author: "Oscar Wilde", text, format: "txt", rightsConfirmed: true } });
    expect(await screen.findByText("story page")).toBeInTheDocument();
  });

  it("refuses other file types with a simple message", async () => {
    const { Route } = await import("@/routes/_learner.add-book");
    const root = createRootRoute();
    const page = createRoute({ getParentRoute: () => root, path: "/add-book", component: Route.options.component! });
    const router = createRouter({ routeTree: root.addChildren([page]), history: createMemoryHistory({ initialEntries: ["/add-book"] }) });
    render(<QueryClientProvider client={new QueryClient()}><RouterProvider router={router} /></QueryClientProvider>);
    const user = userEvent.setup({ applyAccept: false });
    await user.upload(await screen.findByLabelText(copy.ownBooks.file), new File(["x"], "book.docx"));
    expect(await screen.findByRole("alert")).toHaveTextContent(copy.ownBooks.errors.type);
  });
});
