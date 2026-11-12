import fs from 'fs';
import path from 'path';
import type { Section } from '../types';

export const DEMO_BOOK_ID = 'platero-y-yo';

const BOOK_TITLES: Record<string, string> = {
  'platero-y-yo': 'Platero y yo (Juan Ramón Jiménez)',
};

const CHAPTER_HEADER_RE = /^[IVXLCDM]+$/;
const FALLBACK_CHUNK_WORDS = 800;

export function splitIntoSections(fullText: string, bookId: string): Section[] {
  const lines = fullText.split('\n');

  type Header = { line: string; lineIndex: number };
  const headers: Header[] = [];
  lines.forEach((line, lineIndex) => {
    if (CHAPTER_HEADER_RE.test(line.trim())) {
      headers.push({ line: line.trim(), lineIndex });
    }
  });

  if (headers.length === 0) {
    return splitIntoChunks(fullText, bookId);
  }

  const sections: Section[] = headers.map((header, i) => {
    const startLine = header.lineIndex + 1;
    const endLine = i + 1 < headers.length ? headers[i + 1].lineIndex : lines.length;
    const text = lines.slice(startLine, endLine).join('\n').trim();
    return {
      id: `${bookId}-${i}`,
      bookId,
      index: i,
      title: header.line,
      text,
    };
  });

  return sections;
}

function splitIntoChunks(fullText: string, bookId: string): Section[] {
  const words = fullText.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [
      {
        id: `${bookId}-0`,
        bookId,
        index: 0,
        title: 'I',
        text: fullText.trim(),
      },
    ];
  }

  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += FALLBACK_CHUNK_WORDS) {
    chunks.push(words.slice(i, i + FALLBACK_CHUNK_WORDS).join(' '));
  }

  return chunks.map((chunk, index) => ({
    id: `${bookId}-${index}`,
    bookId,
    index,
    title: String(index + 1),
    text: chunk,
  }));
}

export function loadBook(bookId: string): { id: string; title: string; sections: Section[] } {
  const filePath = path.join(process.cwd(), 'data', 'books', `${bookId}.txt`);
  const fullText = fs.readFileSync(filePath, 'utf-8');
  const sections = splitIntoSections(fullText, bookId);
  const title = BOOK_TITLES[bookId] ?? bookId;

  return { id: bookId, title, sections };
}

export function getSection(sectionId: string): Section | undefined {
  const book = loadBook(DEMO_BOOK_ID);
  return book.sections.find((section) => section.id === sectionId);
}
