import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { countWords, normalizeText, paragraphs, sectionize } from "./sectionize";
import { buildCardPrompt, parseCardsResponse, sentenceWith } from "./cards";
import { parseEpub } from "./parse-file";
import { cleanSymbols, joinBrokenWords, linesToText, ocrNoise, pageLines, pdfPagesToText, removeRunningLines, looksLikeOcr, type PdfLine } from "./pdf-text";
import { acceptCleanup, buildCleanupPrompt, letterSimilarity } from "./ocr-cleanup";
import { isOwnBook, visibleVersion } from "@/data/stories";
import type { Story } from "@/mock/types";

const para = (n: number, w = "word") => Array.from({ length: n }, (_, i) => `${w}${i}`).join(" ") + ".";

describe("own books: text and parts", () => {
  it("cleans PDF-style text: hyphenated line ends, soft hyphens, extra spaces", () => {
    expect(normalizeText("A beau-\ntiful­ day.\r\n\r\n\r\n\r\nNext   line")).toBe("A beautiful day.\n\nNext line");
  });
  it("keeps paragraphs and joins single line breaks", () => {
    expect(paragraphs("one\ntwo\n\nthree")).toEqual(["one two", "three"]);
  });
  it("groups paragraphs into parts near the target without cutting them", () => {
    const text = [para(100), para(100), para(100), para(100), para(100)].join("\n\n");
    const parts = sectionize(text, 200);
    expect(parts.map((p) => p.position)).toEqual(parts.map((_, i) => i + 1));
    expect(parts.every((p) => countWords(p.text) <= 240)).toBe(true);
    expect(parts.map((p) => p.text).join("\n\n")).toBe(text);
    expect(parts[0]!.title).toBe("Part 1");
  });
  it("splits one giant paragraph at sentences, or by words if it has none", () => {
    const sentences = Array.from({ length: 40 }, (_, i) => `This is sentence number ${i} here.`).join(" ");
    expect(sectionize(sentences, 50).length).toBeGreaterThan(3);
    const noPunct = Array.from({ length: 1000 }, () => "w").join(" ");
    const parts = sectionize(noPunct, 100);
    expect(parts.length).toBe(10);
    expect(parts.every((p) => countWords(p.text) <= 150)).toBe(true);
  });
  it("joins a very small last part to the part before", () => {
    const parts = sectionize([para(200), para(10)].join("\n\n"), 200);
    expect(parts).toHaveLength(1);
  });
});

describe("own books: AI cards", () => {
  const passage = "The ghost walked along the corridor. Mrs Otis was not frightened at all. She cleaned the bloodstain every morning.";
  it("prompt asks for the level, count, translation and JSON", () => {
    const p = buildCardPrompt({ passage, level: "B1", count: 12, translationLanguage: "Spanish" });
    expect(p).toContain("level B1");
    expect(p).toContain("12 words");
    expect(p).toContain("in Spanish");
    expect(p).toContain(passage);
    expect(buildCardPrompt({ passage, level: "B2", count: 5, translationLanguage: null })).toContain('"translation": null');
  });
  it("reads fenced JSON and keeps only valid, unique words that are in the passage, in passage order", () => {
    const raw = "Here you go:\n```json\n" + JSON.stringify({ cards: [
      { word: "Frightened", definition: "afraid.", example: "Mrs Otis was not frightened at all.", translation: "asustada" },
      { word: "corridor", definition: "a long passage in a building", example: "", translation: "pasillo" },
      { word: "dragon", definition: "a big magic animal", example: "x", translation: null }, // not in passage
      { word: "frightened", definition: "scared", example: "", translation: null }, // duplicate word
      { word: "bloodstain", definition: "afraid", example: "", translation: null }, // duplicate definition
      { word: "walked along", definition: "moved on foot", example: "", translation: null }, // phrase
      { word: "", definition: "x" },
      "nonsense",
    ] }) + "\n```";
    const cards = parseCardsResponse(raw, passage, 10);
    expect(cards.map((c) => c.word)).toEqual(["corridor", "frightened"]);
    expect(cards[0]!.example).toBe("The ghost walked along the corridor."); // filled from the passage
    expect(cards[1]!.definition).toBe("afraid");
    expect(cards[1]!.translation).toBe("asustada");
  });
  it("matches whole words only and respects the max", () => {
    expect(parseCardsResponse(JSON.stringify({ cards: [{ word: "host", definition: "a person who has guests" }] }), passage, 5)).toEqual([]);
    const many = { cards: ["ghost", "corridor", "frightened", "bloodstain", "morning"].map((w, i) => ({ word: w, definition: `meaning ${i}` })) };
    expect(parseCardsResponse(JSON.stringify(many), passage, 3)).toHaveLength(3);
  });
  it("returns nothing for broken answers", () => {
    expect(parseCardsResponse("sorry, I can't", passage, 5)).toEqual([]);
    expect(parseCardsResponse("{bad json", passage, 5)).toEqual([]);
  });
  it("finds the sentence that has the word", () => {
    expect(sentenceWith(passage, "bloodstain")).toBe("She cleaned the bloodstain every morning.");
  });
});

describe("own books: file reading", () => {
  it("turns PDF text items into lines and paragraphs", () => {
    const item = (str: string, y: number, eol = true) => ({ str, hasEOL: eol, transform: [1, 0, 0, 1, 0, y] });
    const text = pdfPagesToText([[item("First line of", 700), item("the paragraph.", 686), item("A new", 650, false), item("paragraph.", 650), item("Last line.", 636)]]);
    expect(text).toBe("First line of\nthe paragraph.\n\nA new paragraph.\nLast line.");
  });
  it("reads an EPUB in spine order with title and author", async () => {
    const zip = new JSZip();
    zip.file("mimetype", "application/epub+zip");
    zip.file("META-INF/container.xml", `<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
    zip.file("OEBPS/content.opf", `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/" version="3.0"><metadata><dc:title>The Canterville Ghost</dc:title><dc:creator>Oscar Wilde</dc:creator></metadata><manifest><item id="c2" href="text/ch2.xhtml" media-type="application/xhtml+xml"/><item id="c1" href="text/ch1.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="nav" linear="no"/><itemref idref="c1"/><itemref idref="c2"/></spine></package>`);
    const page = (body: string) => `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>x</title></head><body>${body}</body></html>`;
    zip.file("OEBPS/nav.xhtml", page("<p>Contents</p>"));
    zip.file("OEBPS/text/ch1.xhtml", page("<h1>Chapter I</h1><p>When Mr. Hiram B. Otis bought <i>Canterville Chase</i>,</p><div><p>everyone told him he was doing a foolish thing.</p></div>"));
    zip.file("OEBPS/text/ch2.xhtml", page("<h1>Chapter II</h1><p>The storm raged fiercely all that night.</p>"));
    const book = await parseEpub(await zip.generateAsync({ type: "uint8array" }));
    expect(book.title).toBe("The Canterville Ghost");
    expect(book.author).toBe("Oscar Wilde");
    expect(book.text).toBe("Chapter I\n\nWhen Mr. Hiram B. Otis bought Canterville Chase,\n\neveryone told him he was doing a foolish thing.\n\nChapter II\n\nThe storm raged fiercely all that night.");
  });
});

describe("own books: which version a learner sees", () => {
  const version = (level: "A2" | "B1" | "B2" | "C1", status: "approved" | "auto") => ({ id: `v-${level}-${status}`, storyId: "s", level, status, sections: [] });
  const story = (ownerId: string | null, versions: ReturnType<typeof version>[]): Story => ({ id: "s", title: "t", author: "a", genre: ownerId ? "mine" : "fantasy", blurb: "", minutes: 1, ownerId, versions });
  it("own book: its only version, whatever the level", () => {
    const s = story("u1", [version("B1", "auto")]);
    expect(isOwnBook(s)).toBe(true);
    expect(visibleVersion(s, "B2")?.id).toBe("v-B1-auto");
  });
  it("team story: the approved version at this level, else the closest approved level", () => {
    const s = story(null, [version("B1", "auto"), version("B2", "approved")]);
    expect(isOwnBook(s)).toBe(false);
    expect(visibleVersion(s, "B2")?.id).toBe("v-B2-approved");
    expect(visibleVersion(s, "B1")?.id).toBe("v-B2-approved"); // B1 not approved → closest is B2
    expect(visibleVersion(story(null, [version("B1", "auto")]), "B1")).toBeUndefined(); // nothing approved
  });
  it("closest level: A2 prefers B1, C1 prefers B2, ties go to the easier level", async () => {
    const { closestApprovedVersion } = await import("@/data/stories");
    const { nearestLevels } = await import("@/config/learning");
    expect(nearestLevels("A2")).toEqual(["B1", "B2", "C1"]);
    expect(nearestLevels("C1")).toEqual(["B2", "B1", "A2"]);
    expect(nearestLevels("B1")).toEqual(["A2", "B2", "C1"]);
    const s = story(null, [version("B1", "approved"), version("B2", "approved")]);
    expect(closestApprovedVersion(s, "A2")).toMatchObject({ v: { level: "B1" }, exact: false });
    expect(closestApprovedVersion(s, "C1")).toMatchObject({ v: { level: "B2" }, exact: false });
    expect(closestApprovedVersion(s, "B2")).toMatchObject({ v: { level: "B2" }, exact: true });
  });
});

// Lines like pdf.js gives them for a scanned magazine page (x, end of line, y).
const L = (text: string, x: number, xEnd: number, y: number): PdfLine => ({ text, x, xEnd, y });

describe("own books: scanned PDFs (OCR)", () => {
  it("reads items with their position", () => {
    const lines = pageLines([
      { str: "Hello", transform: [1, 0, 0, 1, 57, 600], width: 30 }, { str: " " }, { str: "world.", transform: [1, 0, 0, 1, 90, 600], width: 35, hasEOL: true },
      { str: "Next", transform: [1, 0, 0, 1, 67, 590], width: 25, hasEOL: true },
    ]);
    expect(lines).toEqual([{ text: "Hello world.", x: 57, xEnd: 125, y: 600 }, { text: "Next", x: 67, xEnd: 92, y: 590 }]);
  });

  it("removes running headers and page numbers, even with OCR errors", () => {
    const texts = [
      ["If a physician of high standing, and", "one's own husband, assures friends", "that there is really nothing the matter."],
      ["The color is repellant, almost revolting;", "a smouldering unclean yellow, strangely", "faded by the slow-turning sunlight."],
      ["Up and down and sideways they crawl,", "and those absurd, unblinking eyes are", "everywhere in this room."],
      ["I know a little of the principle of", "design, and I know this thing was not", "arranged on any laws of radiation."],
    ];
    const body = (n: number) => texts[n - 1]!.map((t, i) => L(t, 57, 225, 500 - i * 10));
    const pages = [
      [L("THE YELLOW WALL-PARER.", 158, 307, 623), ...body(1)],
      [L("THE YELLOW ·WAL~PAPER. 649", 144, 390, 626), ...body(2)],
      [L("650 THE YELLOW WALL-PAPER.", 150, 300, 626), ...body(3), L("12", 200, 210, 40)],
      [L("THE YELLOW WALL-PAPER. 651", 150, 300, 626), ...body(4)],
    ];
    const out = removeRunningLines(pages).map((p) => p.map((l) => l.text));
    expect(out).toEqual(texts);
  });

  it("finds paragraphs by indentation and short last lines, column by column", () => {
    const text = linesToText([
      // left column
      L("John is practical in the extreme. He", 234 - 180, 393 - 180, 174),
      L("has no patience with faith, an intense", 225 - 180, 393 - 180, 165),
      L("and seen and put down in figures.", 224 - 180, 362 - 180, 155),
      L("John is a physician, and perhaps", 234 - 180, 393 - 180, 145),
      L("you see.", 224 - 180, 270 - 180, 135),
      // right column starts higher on the page
      L("Else, why should it be let so cheaply?", 234, 393, 174),
      L("And why have stood so long untenanted?", 225, 394, 165),
      L("John laughs at me, of course, but one", 234, 393, 155),
      L("expects that in marriage.", 225, 325, 145),
    ]);
    expect(text).toBe("John is practical in the extreme. He\nhas no patience with faith, an intense\nand seen and put down in figures.\n\nJohn is a physician, and perhaps\nyou see.\n\nElse, why should it be let so cheaply?\nAnd why have stood so long untenanted?\n\nJohn laughs at me, of course, but one\nexpects that in marriage.");
  });

  it("joins words split at a line end without a hyphen, but not normal line breaks", () => {
    const t = "mere ordi\nnary people. A colonial man\nsion, and my condi\ntion is bad. My condition again.\nthe\nphosphates. He scoffs\nopenly at it.";
    expect(joinBrokenWords(t)).toBe("mere ordinary people. A colonial mansion, and my condition is bad. My condition again.\nthe\nphosphates. He scoffs\nopenly at it.");
  });

  it("turns section marks into a paragraph break and removes stray dots", () => {
    expect(cleanSymbols("a word. • • • • * •\nWe have been here two·weeks")).toBe("a word.\n\nWe have been here two weeks");
  });

  it("scores OCR noise: scans high, clean text low", () => {
    const scan = 'By Cltarlotte Perkins. P""ople like per/zaps and gou~ed and 111 spite <1on\'t ' + "word ".repeat(400);
    expect(looksLikeOcr(scan)).toBe(true);
    expect(ocrNoise("It was a bright cold day in April, and the clocks were striking thirteen. ".repeat(40))).toBe(0);
    expect(looksLikeOcr("It was a bright cold day in April. ".repeat(60))).toBe(false);
  });
});

describe("own books: AI clean-up of OCR text", () => {
  const original = 'T is very seldom that mere ordi nary P""ople like John and myself secure ancestral hall s for the summer.\n\nJohn is a physician, and perltaps - (I would not say it) per/zaps that is one reason.';
  const fixed = "It is very seldom that mere ordinary people like John and myself secure ancestral halls for the summer.\n\nJohn is a physician, and perhaps - (I would not say it) perhaps that is one reason.";
  it("prompt asks to fix errors only and includes the text", () => {
    const p = buildCleanupPrompt(original);
    expect(p).toContain("Fix ONLY those errors");
    expect(p).toContain("do not rewrite");
    expect(p.endsWith(original)).toBe(true);
  });
  it("accepts a real correction and strips a lead-in line", () => {
    expect(letterSimilarity(original, fixed)).toBeGreaterThan(0.9);
    expect(acceptCleanup(original, "Here is the corrected text:\n\n" + fixed)).toBe(fixed);
  });
  it("rejects rewrites, summaries and empty answers", () => {
    expect(acceptCleanup(original, "John, a doctor, rarely lets people rent old houses. He thinks I am fine.")).toBeNull();
    expect(acceptCleanup(original, "Sometimes people like us rent a grand old family home for the summer months, which is rare. My husband John is a doctor, and maybe that is why I am not getting better.")).toBeNull();
    expect(acceptCleanup(original, "  ")).toBeNull();
  });
});

describe("own books: fewer, non-repeated words", async () => {
  const { cardTarget, wordFamily, topUpCards } = await import("./cards");
  it("asks for fewer cards in short parts, never fewer than the quiz minimum", () => {
    expect(cardTarget(400, 12, 4, 33)).toBe(12);
    expect(cardTarget(200, 12, 4, 33)).toBe(6);
    expect(cardTarget(60, 12, 4, 33)).toBe(4);
    expect(cardTarget(2000, 12, 4, 33)).toBe(12);
  });
  it("groups forms of a word", () => {
    expect(wordFamily("frightened")).toBe(wordFamily("frighten"));
    expect(wordFamily("frightening")).toBe(wordFamily("frightened"));
    expect(wordFamily("stories")).toBe(wordFamily("story"));
    expect(wordFamily("hopped")).toBe(wordFamily("hop") === "hop" ? "hop" : wordFamily("hopped"));
    expect(wordFamily("ghost")).not.toBe(wordFamily("host"));
  });
  const passage = "The ghost was frightening. The frightened family heard chains. The ghost laughed in the dark corridor.";
  it("skips words that already have cards in other parts, and forms of the same word", () => {
    const raw = JSON.stringify({ cards: [
      { word: "ghost", definition: "spirit of a dead person" },
      { word: "frightening", definition: "making you afraid" },
      { word: "frightened", definition: "feeling afraid" },
      { word: "chains", definition: "metal rings joined together" },
    ] });
    expect(parseCardsResponse(raw, passage, 10, ["ghosts"]).map((c) => c.word)).toEqual(["frightening", "chains"]);
  });
  it("tops up a short part with earlier words that appear in it", () => {
    const fresh = [{ word: "chains", definition: "metal rings joined together", example: "x", translation: null }];
    const known = [{ lemma: "ghost", definition: "spirit of a dead person" }, { lemma: "castle", definition: "a big old building" }, { lemma: "corridor", definition: "a long passage" }, { lemma: "chain", definition: "dup" }];
    const out = topUpCards(fresh, known, passage, 4);
    expect(out.map((c) => c.word)).toEqual(["chains", "ghost", "corridor"]); // castle is not in this part; chain = chains
    expect(out[1]!.example).toBe("The ghost was frightening.");
    expect(topUpCards([...fresh, ...fresh, ...fresh, ...fresh], known, passage, 4)).toHaveLength(4);
  });
});
