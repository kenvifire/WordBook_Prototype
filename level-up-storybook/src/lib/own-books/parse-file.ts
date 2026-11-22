// Reads an uploaded book in the browser and returns plain text.
// Parsing runs on the learner's device, so the server only receives text (no file storage needed).
import JSZip from "jszip";
import { pdfPagesToText, type PdfTextItem } from "./pdf-text";

export type ParsedBook = { title: string; author: string; text: string; format: "pdf" | "epub" | "txt" };

export class BookFileError extends Error {
  constructor(public code: "type" | "empty" | "scanned" | "broken") { super(code); }
}

// Blob.text()/arrayBuffer() with a FileReader fallback (older Safari, test DOM).
function readFile(file: Blob, as: "text"): Promise<string>;
function readFile(file: Blob, as: "buffer"): Promise<ArrayBuffer>;
function readFile(file: Blob, as: "text" | "buffer"): Promise<string | ArrayBuffer> {
  if (as === "text" && typeof file.text === "function") return file.text();
  if (as === "buffer" && typeof file.arrayBuffer === "function") return file.arrayBuffer();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string | ArrayBuffer);
    r.onerror = () => reject(r.error);
    if (as === "text") r.readAsText(file); else r.readAsArrayBuffer(file);
  });
}

const baseName = (name: string) => name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();

export function bookFormat(file: File): ParsedBook["format"] | null {
  const n = file.name.toLowerCase();
  if (n.endsWith(".pdf") || file.type === "application/pdf") return "pdf";
  if (n.endsWith(".epub") || file.type === "application/epub+zip") return "epub";
  if (n.endsWith(".txt") || file.type === "text/plain") return "txt";
  return null;
}

export async function parseBookFile(file: File): Promise<ParsedBook> {
  const format = bookFormat(file);
  if (!format) throw new BookFileError("type");
  let parsed: Omit<ParsedBook, "format">;
  try {
    if (format === "pdf") parsed = await parsePdf(file);
    else if (format === "epub") parsed = await parseEpub(await readFile(file, "buffer"));
    else parsed = { title: "", author: "", text: await readFile(file, "text") };
  } catch (e) {
    if (e instanceof BookFileError) throw e;
    throw new BookFileError("broken");
  }
  if (!parsed.text.trim()) throw new BookFileError(format === "pdf" ? "scanned" : "empty");
  return { ...parsed, title: parsed.title || baseName(file.name), format };
}

// ---------- PDF (text layer only; scanned PDFs without OCR have no text) ----------
async function parsePdf(file: File) {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await readFile(file, "buffer")) }).promise;
  const pages: PdfTextItem[][] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items as PdfTextItem[]);
  }
  const meta = await doc.getMetadata().catch(() => null);
  const info = (meta?.info ?? {}) as Record<string, unknown>;
  return { title: typeof info["Title"] === "string" ? info["Title"].trim() : "", author: typeof info["Author"] === "string" ? info["Author"].trim() : "", text: pdfPagesToText(pages) };
}

// ---------- EPUB (a zip with XHTML chapters in reading order) ----------
const BLOCKS = "p, h1, h2, h3, h4, h5, h6, li, blockquote, pre";

function parseXml(s: string, type: DOMParserSupportedType) {
  const d = new DOMParser().parseFromString(s, type);
  return d.getElementsByTagName("parsererror").length ? null : d;
}

const resolvePath = (base: string, href: string) => {
  const parts = (base.includes("/") ? base.slice(0, base.lastIndexOf("/") + 1) : "").concat(decodeURIComponent(href.split("#")[0]!)).split("/");
  const out: string[] = [];
  for (const p of parts) { if (p === "..") out.pop(); else if (p && p !== ".") out.push(p); }
  return out.join("/");
};

export async function parseEpub(data: ArrayBuffer | Uint8Array) {
  const zip = await JSZip.loadAsync(data);
  const container = await zip.file("META-INF/container.xml")?.async("string");
  const opfPath = container && parseXml(container, "application/xml")?.getElementsByTagName("rootfile")[0]?.getAttribute("full-path");
  if (!opfPath) throw new BookFileError("broken");
  const opfText = await zip.file(opfPath)?.async("string");
  const opf = opfText ? parseXml(opfText, "application/xml") : null;
  if (!opf) throw new BookFileError("broken");
  const meta = (tag: string) => opf.getElementsByTagNameNS("*", tag)[0]?.textContent?.trim() ?? "";
  const manifest = new Map<string, string>();
  for (const item of Array.from(opf.getElementsByTagNameNS("*", "item"))) {
    const id = item.getAttribute("id"), href = item.getAttribute("href");
    if (id && href) manifest.set(id, href);
  }
  const chapters: string[] = [];
  for (const ref of Array.from(opf.getElementsByTagNameNS("*", "itemref"))) {
    if (ref.getAttribute("linear") === "no") continue;
    const href = manifest.get(ref.getAttribute("idref") ?? "");
    if (!href) continue;
    const html = await zip.file(resolvePath(opfPath, href))?.async("string");
    if (!html) continue;
    const doc = parseXml(html, "application/xhtml+xml") ?? new DOMParser().parseFromString(html, "text/html");
    const body = doc.getElementsByTagName("body")[0] ?? doc.documentElement;
    const blocks = Array.from(body.querySelectorAll(BLOCKS)).filter((el) => !el.querySelector(BLOCKS));
    const text = (blocks.length ? blocks.map((b) => b.textContent ?? "") : [body.textContent ?? ""])
      .map((t) => t.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n\n");
    if (text) chapters.push(text);
  }
  return { title: meta("title"), author: meta("creator"), text: chapters.join("\n\n") };
}
