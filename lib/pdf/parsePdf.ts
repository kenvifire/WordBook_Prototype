import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export type ParsedPdf = {
  text: string;
  pageTexts: string[]; // text per page, in order — needed by splitByPageCount for exact PDF page boundaries
  outline: string[] | null; // top-level bookmark titles, in order, or null if none
};

const NO_TEXT_ERROR =
  'Could not extract text from this PDF — it may be a scanned, image-only document';

function joinTextItems(items: ReadonlyArray<Record<string, unknown>>): string {
  return items
    .map((item) => (typeof item.str === 'string' ? item.str : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function parsePdf(buffer: Buffer): Promise<ParsedPdf> {
  try {
    const pdfDocument = await getDocument({ data: new Uint8Array(buffer) }).promise;

    const pageTexts: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber++) {
      const page = await pdfDocument.getPage(pageNumber);
      const textContent = await page.getTextContent();
      pageTexts.push(joinTextItems(textContent.items));
    }

    const text = pageTexts.join(' ').replace(/\s+/g, ' ').trim();

    if (text.length === 0) {
      throw new Error(NO_TEXT_ERROR);
    }

    const outlineNodes = await pdfDocument.getOutline();
    const outline =
      outlineNodes && outlineNodes.length > 0 ? outlineNodes.map((node) => node.title) : null;

    return { text, pageTexts, outline };
  } catch (err) {
    if (err instanceof Error && err.message === NO_TEXT_ERROR) {
      throw err;
    }
    throw new Error('Could not parse PDF file', { cause: err });
  }
}
