import { describe, test, expect } from 'vitest';
import { splitByFixedWordCount, splitByPageCount, splitByChapters } from './sectionize';

describe('splitByFixedWordCount', () => {
  test('splits text into 150-word sections, last section shorter', () => {
    const words = Array.from({ length: 320 }, (_, i) => `word${i}`);
    const sections = splitByFixedWordCount(words.join(' '));
    expect(sections).toHaveLength(3);
    expect(sections[0]).toMatchObject({ sectionNumber: 1, startWordIndex: 0, endWordIndex: 150 });
    expect(sections[2]).toMatchObject({ sectionNumber: 3, startWordIndex: 300, endWordIndex: 320 });
    expect(sections[2].text.split(/\s+/)).toHaveLength(20);
  });

  test('a book shorter than 150 words is a single section', () => {
    const sections = splitByFixedWordCount('one two three');
    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({ sectionNumber: 1, startWordIndex: 0, endWordIndex: 3 });
  });

  test('empty text produces zero sections', () => {
    expect(splitByFixedWordCount('')).toHaveLength(0);
  });
});

describe('splitByPageCount', () => {
  test('groups N pages worth of words per section using the words-per-page constant', () => {
    const text = Array.from({ length: 1000 }, (_, i) => `w${i}`).join(' ');
    const sections = splitByPageCount(text, 2, 100); // 2 pages/section, 100 words/page -> 200 words/section
    expect(sections[0].endWordIndex - sections[0].startWordIndex).toBe(200);
  });

  test('uses WORDS_PER_PAGE as the default wordsPerPage', () => {
    const text = Array.from({ length: 1000 }, (_, i) => `w${i}`).join(' ');
    const sections = splitByPageCount(text, 1); // 1 page/section, default 250 words/page
    expect(sections[0].endWordIndex - sections[0].startWordIndex).toBe(250);
  });

  test('last section is shorter when word count does not divide evenly', () => {
    const text = Array.from({ length: 350 }, (_, i) => `w${i}`).join(' ');
    const sections = splitByPageCount(text, 1, 100);
    expect(sections).toHaveLength(4);
    expect(sections[3]).toMatchObject({ sectionNumber: 4, startWordIndex: 300, endWordIndex: 350 });
  });
});

describe('splitByChapters', () => {
  test('makes one section per break, including the trailing section after the last break', () => {
    const text = Array.from({ length: 300 }, (_, i) => `w${i}`).join(' ');
    const sections = splitByChapters(text, [0, 100, 220]);
    expect(sections.map((s) => s.startWordIndex)).toEqual([0, 100, 220]);
    expect(sections[2].endWordIndex).toBe(300);
  });

  test('prepends an implicit 0 break when the first break is not already 0', () => {
    const text = Array.from({ length: 300 }, (_, i) => `w${i}`).join(' ');
    const sections = splitByChapters(text, [100, 220]);
    expect(sections.map((s) => s.startWordIndex)).toEqual([0, 100, 220]);
    expect(sections[0].endWordIndex).toBe(100);
    expect(sections[2].endWordIndex).toBe(300);
  });

  test('sectionNumber increments from 1 and sorts/de-duplicates breaks', () => {
    const text = Array.from({ length: 300 }, (_, i) => `w${i}`).join(' ');
    const sections = splitByChapters(text, [220, 100, 100, 0]);
    expect(sections.map((s) => s.sectionNumber)).toEqual([1, 2, 3]);
    expect(sections.map((s) => s.startWordIndex)).toEqual([0, 100, 220]);
  });
});
