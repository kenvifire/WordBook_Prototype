import { describe, test, expect } from 'vitest';
import { detectChapterBreaksByHeading, detectChapterBreaksFromTitles } from './detectChapters';

describe('detectChapterBreaksByHeading', () => {
  test('finds word-index breaks at "Chapter N" headings', () => {
    const text = 'Intro text here. Chapter 1 First chapter body. Chapter 2 Second chapter body.';
    // Word indices (0-based, whitespace-split): 0 Intro, 1 text, 2 here.,
    // 3 Chapter, 4 1, 5 First, 6 chapter, 7 body., 8 Chapter, 9 2, ...
    expect(detectChapterBreaksByHeading(text)).toEqual([3, 8]);
  });

  test('finds spelled-out chapter numbers too', () => {
    const text = 'Preface here. Chapter One begins now. Chapter Two continues onward.';
    // 0 Preface, 1 here., 2 Chapter, 3 One, 4 begins, 5 now., 6 Chapter, 7 Two, ...
    expect(detectChapterBreaksByHeading(text)).toEqual([2, 6]);
  });

  test('returns null when fewer than 2 headings are found', () => {
    expect(detectChapterBreaksByHeading('Just one Chapter 1 heading here, nothing else.')).toBeNull();
  });

  test('returns null when no headings are found', () => {
    expect(detectChapterBreaksByHeading('No headings in this text at all.')).toBeNull();
  });
});

describe('detectChapterBreaksFromTitles', () => {
  test('locates chapter titles from an epub/pdf outline within the flattened text', () => {
    const fullText =
      'Preface stuff here before anything starts. Chapter One: The Beginning Lorem ipsum dolor sit amet. Chapter Two: The Journey continues onward here.';
    const chapterTitles = ['Chapter One: The Beginning', 'Chapter Two: The Journey'];
    // 'Chapter One: The Beginning' starts at char 43 -> word index 6
    // 'Chapter Two: The Journey' starts at char 98 -> word index 15
    expect(detectChapterBreaksFromTitles(fullText, chapterTitles)).toEqual([6, 15]);
  });

  test('drops titles that cannot be located in the text', () => {
    const fullText =
      'Preface stuff here before anything starts. Chapter One: The Beginning Lorem ipsum dolor sit amet. Chapter Two: The Journey continues onward here.';
    const chapterTitles = ['Chapter One: The Beginning', 'Nonexistent Chapter Title', 'Chapter Two: The Journey'];
    expect(detectChapterBreaksFromTitles(fullText, chapterTitles)).toEqual([6, 15]);
  });

  test('returns null when fewer than 2 titles resolve', () => {
    const fullText = 'Preface stuff here before anything starts. Chapter One: The Beginning Lorem ipsum.';
    const chapterTitles = ['Chapter One: The Beginning', 'Nonexistent Title'];
    expect(detectChapterBreaksFromTitles(fullText, chapterTitles)).toBeNull();
  });

  test('returns null when no titles resolve', () => {
    expect(detectChapterBreaksFromTitles('Some text here.', ['Nope', 'Also nope'])).toBeNull();
  });
});
