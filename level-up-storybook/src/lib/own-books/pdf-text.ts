// Turns PDF text items (from pdf.js) into clean text with paragraphs.
// Pure functions: no pdf.js import, so they run in tests and on any page.
//
// Scanned books (OCR text layer) need extra care: running headers and page numbers
// on every page, words split at line ends without a hyphen ("ordi / nary"),
// paragraphs marked only by indentation, and stray symbols (•, ·, ~).

export type PdfTextItem = { str?: string; hasEOL?: boolean; transform?: number[]; width?: number };
export type PdfLine = { text: string; x: number | null; xEnd: number | null; y: number | null };

// ---------- 1. Items → lines ----------
export function pageLines(items: PdfTextItem[]): PdfLine[] {
  const lines: PdfLine[] = [];
  let cur = "";
  let y: number | null = null, x: number | null = null, xEnd: number | null = null;
  const flush = () => {
    const text = cur.replace(/\s+/g, " ").trim();
    if (text) lines.push({ text, x, xEnd, y });
    cur = ""; y = null; x = null; xEnd = null;
  };
  for (const it of items) {
    const s = it.str ?? "";
    const ix = it.transform?.[4];
    const iy = it.transform?.[5];
    if (s.trim() && typeof ix === "number") {
      x = x === null ? ix : Math.min(x, ix);
      if (typeof it.width === "number" && it.width > 0) xEnd = Math.max(xEnd ?? ix, ix + it.width);
    }
    if (y === null && typeof iy === "number" && s.trim()) y = iy;
    cur += s;
    if (it.hasEOL) flush();
    else if (s && !s.endsWith(" ")) cur += " ";
  }
  flush();
  return lines;
}

// ---------- 2. Running headers, footers and page numbers ----------
const letters = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, "");
const isPageNumber = (s: string) => /^[^A-Za-z0-9]*\d{1,4}[^A-Za-z0-9]*$/.test(s);

function similar(a: string, b: string): number {
  if (!a || !b) return 0;
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const row = [i];
    for (let j = 1; j <= n; j++) row[j] = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = row;
  }
  return 1 - prev[n]! / Math.max(m, n);
}

// A line near the top or bottom of a page that looks the same on many pages is a running header/footer.
export function removeRunningLines(pages: PdfLine[][]): PdfLine[][] {
  const EDGE = 2;
  const edgeKeys = pages.map((lines) => [...lines.slice(0, EDGE), ...lines.slice(-EDGE)].map((l) => letters(l.text)).filter((k) => k.length >= 4));
  const minPages = Math.max(2, Math.ceil(pages.length * 0.3));
  const repeated = (key: string, page: number) =>
    edgeKeys.filter((keys, p) => p !== page && keys.some((k) => similar(k, key) >= 0.7)).length + 1 >= minPages;
  return pages.map((lines, p) =>
    lines.filter((l, i) => {
      const atEdge = i < EDGE || i >= lines.length - EDGE;
      if (!atEdge) return true;
      if (isPageNumber(l.text)) return false;
      const key = letters(l.text);
      return !(key.length >= 4 && pages.length >= 3 && repeated(key, p));
    }),
  );
}

// ---------- 3. Lines → paragraphs ----------
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)]! : 0; };
const ENDS_SENTENCE = /[.!?:;]["'”’)\]]*$/;

// A page can have several columns. pdf.js gives them one after the other: when the next line
// is higher on the page than the one before, a new column (block) starts.
function splitColumns(lines: PdfLine[]): PdfLine[][] {
  const blocks: PdfLine[][] = [];
  for (const l of lines) {
    const block = blocks[blocks.length - 1];
    const prev = block?.[block.length - 1];
    if (!block || (prev && prev.y !== null && l.y !== null && l.y > prev.y + 2)) blocks.push([l]);
    else block.push(l);
  }
  return blocks;
}

function blockToText(lines: PdfLine[]): string {
  const gaps = lines.slice(1).map((l, i) => (l.y !== null && lines[i]!.y !== null ? Math.abs(lines[i]!.y! - l.y) : 0)).filter((g) => g > 0);
  const normalGap = median(gaps);
  // Left margin: a low percentile, so indented first lines do not pull it to the right.
  const xs = lines.map((l) => l.x).filter((v): v is number => v !== null).sort((a, b) => a - b);
  const left = xs.length ? xs[Math.floor(xs.length * 0.25)]! : 0;
  const ends = lines.map((l) => l.xEnd).filter((v): v is number => v !== null).sort((a, b) => a - b);
  const right = ends.length ? ends[Math.floor(ends.length * 0.9)]! : 0;
  const width = right - left;
  let out = lines[0]!.text;
  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1]!, l = lines[i]!;
    const gap = prev.y !== null && l.y !== null ? Math.abs(prev.y - l.y) : 0;
    const bigGap = normalGap > 0 && gap > normalGap * 1.6;
    const indented = width > 50 && l.x !== null && l.x - left > Math.max(5, width * 0.03) && l.x - left < width * 0.3;
    const shortEnd = width > 50 && prev.xEnd !== null && prev.xEnd < right - width * 0.15 && ENDS_SENTENCE.test(prev.text);
    out += bigGap || indented || shortEnd ? "\n\n" + l.text : "\n" + l.text;
  }
  return out;
}

export function linesToText(lines: PdfLine[]): string {
  const clean = lines.filter((l) => !isJunkLine(l.text));
  if (!clean.length) return "";
  return joinPages(splitColumns(clean).map(blockToText));
}

// Lines that are only symbols or a stray letter (OCR dust).
function isJunkLine(s: string): boolean {
  const t = s.trim();
  if (/^[^A-Za-z0-9]+$/.test(t) && !/[*]{1}.*[*]/.test(t)) return true;
  return /^[A-Za-z]$/.test(t) && !/^[aAI]$/.test(t);
}

// ---------- 4. Pages → one text ----------
export function joinPages(pageTexts: string[]): string {
  let out = "";
  for (const t of pageTexts.map((x) => x.trim()).filter(Boolean)) {
    if (!out) { out = t; continue; }
    // A page that ends mid-sentence continues on the next page.
    out += ENDS_SENTENCE.test(out) || /\*\s*$/.test(out) ? "\n\n" + t : "\n" + t;
  }
  return out;
}

// ---------- 5. Words split at line ends without a hyphen ----------
// Small list of very common words: a line break after these is a normal word break.
const COMMON = new Set(("a an and are as at be been but by can could did do does for from had has have he her him his how i if in into is it its " +
  "me more my no not now of on one only or our out over she should so some such than that the their them then there these they this " +
  "those to too up upon us very was we were what when where which while who why will with would you your all any each every much many " +
  "most other own same few after again also before between down here just off once through under until well").split(" "));
const FRAGMENT_END = /(tion|tions|sion|sions|ing|ings|ness|ment|ments|ly|ful|ance|ence|ant|ent|able|ible|ous|ious|ity|ive|ture|ary|ery|ory|less|ward|ism|ist|ize|ise|dren|ple|tle|ble|ated|ating|ened|ening|ered|ering)$/;

// Word endings that are never words on their own.
const NOT_A_WORD = /^(tion|tions|sion|sions|ing|ings|ness|ment|ments|ture|tures|dren|ance|ence|ious|ous|ible|ity|ery|ory|ful|ly|ingly|ating|ated|ened|ening)$/;

export function joinBrokenWords(text: string): string {
  const vocab = new Map<string, number>();
  for (const w of text.toLowerCase().match(/[a-z]+/g) ?? []) vocab.set(w, (vocab.get(w) ?? 0) + 1);
  const count = (w: string) => vocab.get(w) ?? 0;
  return text.replace(/([A-Za-z]{2,})\n([a-z]{2,})(?=[^A-Za-z]|$)/g, (m, a: string, b: string) => {
    const la = a.toLowerCase();
    const joined = la + b;
    if (COMMON.has(la) && COMMON.has(b)) return m;
    if (count(joined) >= 1) return a + b; // the whole word appears elsewhere in the book
    const fragments = count(la) === 1 && count(b) === 1 && !COMMON.has(la) && !COMMON.has(b);
    if (fragments && a.length <= 6 && b.length <= 5 && FRAGMENT_END.test(b)) return a + b;
    if (NOT_A_WORD.test(b)) return a + b; // "man / sion", "noth / ing"
    return m;
  });
}

// ---------- 6. Stray symbols from OCR ----------
export function cleanSymbols(text: string): string {
  return text
    .replace(/(?:\s*[•·*]){3,}\s*/g, "\n\n") // "• • • *" or "* * * *" section marks → paragraph break
    .replace(/[•·]/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Whole pipeline for one PDF: pages of items → clean text.
export function pdfPagesToText(pages: PdfTextItem[][]): string {
  const lines = removeRunningLines(pages.map(pageLines));
  return cleanSymbols(joinBrokenWords(joinPages(lines.map(linesToText))));
}

// ---------- OCR noise score ----------
// Share of words with signs of bad text recognition (odd symbols or digits inside words, quotes in the middle of a word…).
// Clean, born-digital text scores near 0.
export function ocrNoise(text: string): number {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (!tokens.length) return 0;
  const bad = tokens.filter((t) =>
    /[\\/~|^_{}<>•·]/.test(t) ||
    /[A-Za-z]\d|\d[A-Za-z]/.test(t) ||
    /[A-Za-z]["”“][A-Za-z]/.test(t) ||
    /[a-z][A-Z]{1,2}[a-z]/.test(t),
  ).length;
  return bad / tokens.length;
}
// Measured on the whole book: 1 odd word per 1000 means a scan with text recognition.
// (The Yellow Wall-Paper scan scores 0.0025; born-digital PDFs score close to 0.)
export const OCR_NOISE_LIMIT = 0.001;
export const looksLikeOcr = (text: string) => ocrNoise(text) >= OCR_NOISE_LIMIT;
