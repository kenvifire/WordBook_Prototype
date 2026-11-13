import { describe, test, expect } from 'vitest';
import { splitIntoSections } from './sectionize';

describe('splitIntoSections', () => {
  test('splits text into 150-word sections, last section shorter', () => {
    const words = Array.from({ length: 320 }, (_, i) => `word${i}`);
    const sections = splitIntoSections(words.join(' '));
    expect(sections).toHaveLength(3);
    expect(sections[0]).toMatchObject({ sectionNumber: 1, startWordIndex: 0, endWordIndex: 150 });
    expect(sections[2]).toMatchObject({ sectionNumber: 3, startWordIndex: 300, endWordIndex: 320 });
    expect(sections[2].text.split(/\s+/)).toHaveLength(20);
  });

  test('a book shorter than 150 words is a single section', () => {
    const sections = splitIntoSections('one two three');
    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({ sectionNumber: 1, startWordIndex: 0, endWordIndex: 3 });
  });

  test('empty text produces zero sections', () => {
    expect(splitIntoSections('')).toHaveLength(0);
  });
});
