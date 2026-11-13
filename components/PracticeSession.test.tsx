import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import PracticeSession from './PracticeSession';

const words = [
  { id: 'word-1', word: 'ephemeral', definition: 'lasting a short time' },
  { id: 'word-2', word: 'lucid', definition: 'clear and easy to understand' },
];

async function revealAndRate(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole('button', { name: 'Show definition' }));
  await user.click(screen.getByRole('button', { name: label }));
}

describe('PracticeSession', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('steps through multiple words, posting each rating and advancing', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
    const user = userEvent.setup();

    render(
      <PracticeSession
        words={words}
        doneMessage="Done — check back on the book page."
        doneHref="/book/book-1"
        doneLinkLabel="Back to book"
      />
    );

    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByText('ephemeral')).toBeInTheDocument();

    await revealAndRate(user, 'Good');

    expect(fetch).toHaveBeenCalledWith(
      '/api/words/word-1/rate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ rating: 'good' }),
      })
    );
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(screen.getByText('lucid')).toBeInTheDocument();

    await revealAndRate(user, 'Easy');

    expect(fetch).toHaveBeenCalledWith(
      '/api/words/word-2/rate',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ rating: 'easy' }),
      })
    );
    expect(screen.getByText('Done — check back on the book page.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to book' })).toHaveAttribute(
      'href',
      '/book/book-1'
    );
  });

  test('a failed rating POST shows an error and does not advance to the next word', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });
    const user = userEvent.setup();

    render(
      <PracticeSession
        words={words}
        doneMessage="Done — check back on the book page."
        doneHref="/book/book-1"
        doneLinkLabel="Back to book"
      />
    );

    await revealAndRate(user, 'Good');

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Failed to save rating. Try again.')).toBeInTheDocument();
    // Still on the first word — did not advance to "lucid" or 2 / 2.
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByText('ephemeral')).toBeInTheDocument();
    expect(screen.queryByText('lucid')).not.toBeInTheDocument();
  });

  test('a network error on the rating POST shows an error and does not advance', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network down'));
    const user = userEvent.setup();

    render(
      <PracticeSession
        words={words}
        doneMessage="Done — check back on the book page."
        doneHref="/book/book-1"
        doneLinkLabel="Back to book"
      />
    );

    await revealAndRate(user, 'Good');

    expect(screen.getByText('Failed to save rating. Try again.')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });
});
