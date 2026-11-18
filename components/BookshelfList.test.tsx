import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  // Replaces the old "N of M sections unlocked" text with a visual spine —
  // this is also the brief's own required spine test, reusing the same
  // fixture values rather than duplicating a near-identical test.
  test("a book's spine shows filled segments in the unlocked color up to sectionsUnlocked, unfilled in locked color for the rest", () => {
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

    expect(screen.queryByText('Not yet started')).not.toBeInTheDocument();
    expect(screen.queryByText(/sections unlocked/)).not.toBeInTheDocument();

    const segments = screen.getAllByTestId('spine-segment');
    expect(segments).toHaveLength(5);
    expect(segments.filter((s) => s.className.includes('bg-unlocked'))).toHaveLength(2);
    expect(segments.filter((s) => s.className.includes('bg-locked'))).toHaveLength(3);
  });

  test('the selected language filter chip uses bg-ink/text-paper, not a progress color', async () => {
    const user = userEvent.setup();
    render(
      <BookshelfList
        books={[
          makeBook({ id: 'b1', language: 'english' }),
          makeBook({ id: 'b2', language: 'spanish' }),
        ]}
      />
    );

    const spanishChip = screen.getByRole('button', { name: 'spanish' });
    await user.click(spanishChip);

    expect(spanishChip.className).toContain('bg-ink');
    expect(spanishChip.className).not.toMatch(/bg-(locked|practicing|unlocked|error)\b/);

    const allChip = screen.getByRole('button', { name: 'All' });
    expect(allChip.className).toContain('bg-surface');
    expect(allChip.className).toContain('border-hairline');
  });

  test('a failed generation card uses the error color, not the practicing color', () => {
    render(
      <BookshelfList books={[makeBook({ id: 'b-failed', generationStatus: 'failed' })]} />
    );

    const card = screen.getByText('Generation failed. Please try again.').closest('div');
    expect(card?.className).toContain('error');
    expect(card?.className).not.toContain('practicing');
  });

  // The implementation gates the sweep behind Tailwind's motion-safe:
  // variant (a pure-CSS media query), rather than a JS-level conditional —
  // so the way this requirement is actually verifiable is by confirming the
  // class carries that prefix (if it didn't, the animation would run
  // unconditionally and this assertion would fail), not by mocking
  // matchMedia and checking for an absent class, which wouldn't detect
  // anything since the class string itself never changes at runtime.
  test("the Bookshelf's generating-sweep animation is gated behind motion-safe, respecting prefers-reduced-motion", () => {
    render(<BookshelfList books={[makeBook({ id: 'b-pending', generationStatus: 'pending' })]} />);

    const sweep = screen.getByTestId('generating-sweep');
    expect(sweep.className).toMatch(/motion-safe:animate-/);
  });

  test('the "no books in this language" empty state uses design tokens, not ad-hoc gray', () => {
    render(<BookshelfList books={[]} />);

    const emptyState = screen.getByText(/no books in this language/i);
    expect(emptyState.className).toContain('text-ink-muted');
    expect(emptyState.className).not.toContain('text-gray-600');
  });
});
