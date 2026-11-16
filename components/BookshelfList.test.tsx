import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BookshelfList, { type BookshelfBook } from './BookshelfList';

function makeBook(overrides: Partial<BookshelfBook> = {}): BookshelfBook {
  return {
    id: 'book-1',
    title: 'A Book',
    author: null,
    language: 'english',
    sectionsTotal: 0,
    sectionsUnlocked: 0,
    needsSetup: false,
    ...overrides,
  };
}

describe('BookshelfList', () => {
  // Minor #5: an uploaded book that hasn't finished its sectioning setup
  // yet has zero sections, which previously rendered as the misleading
  // "0 of 0 sections unlocked" instead of something sensible.
  test('a book with needsSetup: true shows "Not yet started" instead of "0 of 0 sections unlocked"', () => {
    render(
      <BookshelfList
        books={[makeBook({ id: 'book-pending', title: 'Pending Book', needsSetup: true })]}
      />
    );

    expect(screen.getByText('Not yet started')).toBeInTheDocument();
    expect(screen.queryByText(/sections unlocked/)).not.toBeInTheDocument();
  });

  test('a book with needsSetup: false and real section counts still shows the normal "N of M" text', () => {
    render(
      <BookshelfList
        books={[
          makeBook({
            id: 'book-started',
            title: 'Started Book',
            needsSetup: false,
            sectionsTotal: 5,
            sectionsUnlocked: 2,
          }),
        ]}
      />
    );

    expect(screen.getByText('2 of 5 sections unlocked')).toBeInTheDocument();
    expect(screen.queryByText('Not yet started')).not.toBeInTheDocument();
  });
});
