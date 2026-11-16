// @vitest-environment node
// PDF parsing (pdfjs-dist) does binary/worker-adjacent work that misbehaves under
// jsdom (the project's default test environment) — run this file in a plain node
// environment instead, mirroring lib/epub/parseEpub.test.ts.
//
// Fixture strategy: rather than hand-constructing real PDF byte buffers (or
// downloading one, which is prohibited), these tests mock pdfjs-dist's
// getDocument at the module level — the same vi.doMock + dynamic-import style
// already used in lib/epub/parseEpub.test.ts for epub2. This exercises parsePdf's
// own logic (joining page text, extracting the outline, throwing on empty text)
// against a controlled fake PDFDocumentProxy, without needing a real binary PDF.
import { describe, test, expect, vi } from 'vitest';

type FakeOutlineNode = { title: string };

function makeFakeDocument(pageTexts: string[], outlineNodes: FakeOutlineNode[] | null) {
  const pages = pageTexts.map((text) => ({
    getTextContent: vi.fn().mockResolvedValue({
      items: text ? [{ str: text }] : [],
    }),
  }));

  return {
    numPages: pages.length,
    getPage: vi.fn((pageNumber: number) => Promise.resolve(pages[pageNumber - 1])),
    getOutline: vi.fn().mockResolvedValue(outlineNodes),
  };
}

function mockPdfjs(fakeDocument: ReturnType<typeof makeFakeDocument>) {
  vi.doMock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
    getDocument: vi.fn(() => ({ promise: Promise.resolve(fakeDocument) })),
  }));
}

describe('parsePdf', () => {
  test('extracts text and per-page text from a text-layer PDF fixture', async () => {
    vi.resetModules();
    mockPdfjs(makeFakeDocument(['Page one text.', 'Page two text.'], null));

    const { parsePdf } = await import('./parsePdf');
    const result = await parsePdf(Buffer.from('irrelevant'));

    expect(result.pageTexts).toEqual(['Page one text.', 'Page two text.']);
    expect(result.text).toBe('Page one text. Page two text.');

    vi.doUnmock('pdfjs-dist/legacy/build/pdf.mjs');
    vi.resetModules();
  });

  test('extracts outline titles when the PDF has bookmarks', async () => {
    vi.resetModules();
    mockPdfjs(
      makeFakeDocument(['Some text.'], [{ title: 'Chapter 1' }, { title: 'Chapter 2' }])
    );

    const { parsePdf } = await import('./parsePdf');
    const result = await parsePdf(Buffer.from('irrelevant'));

    expect(result.outline).toEqual(['Chapter 1', 'Chapter 2']);

    vi.doUnmock('pdfjs-dist/legacy/build/pdf.mjs');
    vi.resetModules();
  });

  test('returns outline: null when the PDF has no bookmarks', async () => {
    vi.resetModules();
    mockPdfjs(makeFakeDocument(['Some text.'], null));

    const { parsePdf } = await import('./parsePdf');
    const result = await parsePdf(Buffer.from('irrelevant'));

    expect(result.outline).toBeNull();

    vi.doUnmock('pdfjs-dist/legacy/build/pdf.mjs');
    vi.resetModules();
  });

  test('throws when the PDF has no extractable text (scanned, no text layer)', async () => {
    vi.resetModules();
    mockPdfjs(makeFakeDocument(['', '   '], null));

    const { parsePdf } = await import('./parsePdf');

    await expect(parsePdf(Buffer.from('irrelevant'))).rejects.toThrow(
      'Could not extract text from this PDF — it may be a scanned, image-only document'
    );

    vi.doUnmock('pdfjs-dist/legacy/build/pdf.mjs');
    vi.resetModules();
  });
});
