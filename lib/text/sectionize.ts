export const SECTION_SIZE = 150;
export const WORDS_PER_PAGE = 250; // approximation for .txt/.epub only

export type Section = {
  sectionNumber: number;
  startWordIndex: number;
  endWordIndex: number;
  text: string;
};

export function splitByFixedWordCount(text: string): Section[] {
  const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
  const sections: Section[] = [];
  for (let start = 0; start < words.length; start += SECTION_SIZE) {
    const end = Math.min(start + SECTION_SIZE, words.length);
    sections.push({
      sectionNumber: sections.length + 1,
      startWordIndex: start,
      endWordIndex: end,
      text: words.slice(start, end).join(' '),
    });
  }
  return sections;
}

export function splitByPageCount(
  text: string,
  pagesPerSection: number,
  wordsPerPage: number = WORDS_PER_PAGE
): Section[] {
  const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
  const chunkSize = pagesPerSection * wordsPerPage;
  const sections: Section[] = [];
  for (let start = 0; start < words.length; start += chunkSize) {
    const end = Math.min(start + chunkSize, words.length);
    sections.push({
      sectionNumber: sections.length + 1,
      startWordIndex: start,
      endWordIndex: end,
      text: words.slice(start, end).join(' '),
    });
  }
  return sections;
}

export function splitByChapters(text: string, chapterBreaks: number[]): Section[] {
  const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
  const breaks = Array.from(new Set(chapterBreaks)).sort((a, b) => a - b);
  if (breaks.length === 0 || breaks[0] !== 0) {
    breaks.unshift(0);
  }
  const sections: Section[] = [];
  for (let i = 0; i < breaks.length; i++) {
    const start = breaks[i];
    const end = i + 1 < breaks.length ? breaks[i + 1] : words.length;
    sections.push({
      sectionNumber: sections.length + 1,
      startWordIndex: start,
      endWordIndex: end,
      text: words.slice(start, end).join(' '),
    });
  }
  return sections;
}
