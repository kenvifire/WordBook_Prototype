import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileUp } from "lucide-react";
import { PageHeader } from "@/components/wb/page-header";
import { Card } from "@/components/wb/card";
import { Button } from "@/components/wb/button";
import { notify } from "@/components/wb/toast";
import { copy } from "@/content/copy";
import { OWN_BOOK_MAX_FILE_MB } from "@/config/learning";
import { BookFileError, parseBookFile, type ParsedBook } from "@/lib/own-books/parse-file";
import { countWords, sectionize } from "@/lib/own-books/sectionize";
import { looksLikeOcr } from "@/lib/own-books/pdf-text";
import { createOwnBook } from "@/lib/own-books.functions";
import { logEvent } from "@/data/events";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_learner/add-book")({
  head: () => seo("Add your book", "Add a PDF, EPUB or TXT book and learn its words."),
  component: AddBook,
});

const input = "mt-1 block min-h-11 w-full rounded-xl border-2 border-ink bg-background px-3";

function AddBook() {
  const c = copy.ownBooks;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [book, setBook] = useState<(ParsedBook & { words: number; parts: number }) | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [rights, setRights] = useState(false);
  const [state, setState] = useState<"idle" | "reading" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    setBook(null); setError(null);
    if (!file) return;
    if (file.size > OWN_BOOK_MAX_FILE_MB * 1024 * 1024) { setError(c.errors.big(OWN_BOOK_MAX_FILE_MB)); return; }
    setState("reading");
    try {
      const parsed = await parseBookFile(file);
      setBook({ ...parsed, words: countWords(parsed.text), parts: sectionize(parsed.text).length });
      setTitle(parsed.title.slice(0, 150)); setAuthor(parsed.author.slice(0, 120));
    } catch (e) {
      setError(e instanceof BookFileError ? c.errors[e.code] : c.errors.broken);
    } finally { setState("idle"); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!book || !rights || !title.trim()) { setError(c.errors.invalid); return; }
    setState("saving"); setError(null);
    try {
      const res = await createOwnBook({ data: { title: title.trim(), author: author.trim(), text: book.text, format: book.format, rightsConfirmed: true } });
      if (!res.ok) { setError(c.errors[res.error]); setState("idle"); return; }
      void logEvent("own_book_upload_finished", res.storyId, { first_part_ready: res.firstPartReady });
      qc.removeQueries({ queryKey: ["stories"] });
      notify.success(res.firstPartReady ? c.added : c.addedLater);
      navigate({ to: "/story/$id", params: { id: res.storyId } });
    } catch {
      setError(c.errors.save_failed); setState("idle");
    }
  }

  return (
    <>
      <PageHeader title={c.title} description={c.desc} />
      <form onSubmit={submit} className="max-w-2xl space-y-4">
        <Card className="space-y-4">
          <label className="block font-semibold">{c.file}
            <span className="mt-1 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-ink bg-background px-3 py-3 focus-within:ring-2 focus-within:ring-ring">
              <FileUp className="h-6 w-6 shrink-0" aria-hidden />
              <input type="file" accept=".pdf,.epub,.txt,application/pdf,application/epub+zip,text/plain" disabled={state !== "idle"}
                onChange={(e) => void pick(e.target.files?.[0])} className="w-full text-sm file:mr-3 file:rounded-full file:border-2 file:border-ink file:bg-secondary file:px-4 file:py-1.5 file:font-bold" />
            </span>
          </label>
          <p className="text-sm text-muted-foreground">{c.fileHint(OWN_BOOK_MAX_FILE_MB)}</p>
          {state === "reading" && <p role="status" className="font-semibold">{c.reading}</p>}
          {book && <p role="status" className="rounded-xl border-2 border-ink bg-lime p-3 font-semibold">{c.words(book.words, book.parts)}</p>}
          {book && book.format === "pdf" && looksLikeOcr(book.text) && <p className="rounded-xl border-2 border-ink bg-muted p-3">{c.scanned}</p>}
        </Card>

        {book && (
          <Card className="space-y-4">
            <label className="block font-semibold">{c.titleLabel}
              <input type="text" required maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
            </label>
            <label className="block font-semibold">{c.author}
              <input type="text" maxLength={120} value={author} onChange={(e) => setAuthor(e.target.value)} placeholder={c.authorHint} className={input} />
            </label>
            <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="h-5 w-5 shrink-0" checked={rights} onChange={(e) => setRights(e.target.checked)} />{c.rights}</label>
          </Card>
        )}

        {error && <p role="alert" className="rounded-xl border-2 border-ink bg-mint p-3 font-semibold">{error}</p>}
        {state === "saving" && <p role="status" className="font-semibold">{c.saving}</p>}
        <Button type="submit" disabled={!book || !rights || !title.trim() || state !== "idle"}>{c.button}</Button>
      </form>
    </>
  );
}
