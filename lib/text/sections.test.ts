import { describe, test, expect } from 'vitest';
import { splitIntoSections, loadBook, getSection, DEMO_BOOK_ID } from './sections';

test('splitIntoSections splits on standalone Roman-numeral headers', () => {
  const sample = 'I\n\nPlatero es pequeño, peludo, suave.\n\nII\n\nLo dejo suelto y se va al prado.\n';
  const sections = splitIntoSections(sample, 'platero-y-yo');
  expect(sections).toHaveLength(2);
  expect(sections[0]).toMatchObject({ bookId: 'platero-y-yo', index: 0, title: 'I' });
  expect(sections[0].text).toContain('Platero es pequeño');
  expect(sections[1].title).toBe('II');
});

test('splitIntoSections falls back to chunking when no headers are found', () => {
  const sections = splitIntoSections('Una sola seccion sin encabezados de capitulo.', 'x');
  expect(sections.length).toBeGreaterThanOrEqual(1);
});

test('loadBook reads the bundled demo book and getSection finds a section by id', () => {
  const book = loadBook(DEMO_BOOK_ID);
  expect(book.sections.length).toBeGreaterThanOrEqual(6);
  const found = getSection(book.sections[1].id);
  expect(found).toEqual(book.sections[1]);
});
