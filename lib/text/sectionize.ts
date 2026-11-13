export const SECTION_SIZE = 150;

export type Section = {
  sectionNumber: number;
  startWordIndex: number;
  endWordIndex: number;
  text: string;
};

export function splitIntoSections(text: string): Section[] {
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
