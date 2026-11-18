import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import RatingButtons from './RatingButtons';

describe('RatingButtons', () => {
  test('renders four buttons labeled Again/Hard/Good/Easy', () => {
    render(<RatingButtons onRate={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Good' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Easy' })).toBeInTheDocument();
  });

  test.each([
    ['Again', 'again'],
    ['Hard', 'hard'],
    ['Good', 'good'],
    ['Easy', 'easy'],
  ])('clicking %s calls onRate with %s', async (label, value) => {
    const onRate = vi.fn();
    const user = userEvent.setup();
    render(<RatingButtons onRate={onRate} />);

    await user.click(screen.getByRole('button', { name: label }));

    expect(onRate).toHaveBeenCalledWith(value);
  });

  test('I7: disabled=true disables every rating button', () => {
    render(<RatingButtons onRate={vi.fn()} disabled />);

    for (const label of ['Again', 'Hard', 'Good', 'Easy']) {
      expect(screen.getByRole('button', { name: label })).toBeDisabled();
    }
  });

  test('gives "Again" the practicing color and Hard/Good/Easy the same unlocked color', () => {
    render(<RatingButtons onRate={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Again' }).className).toContain('bg-practicing');

    const positive = ['Hard', 'Good', 'Easy'].map(
      (label) => screen.getByRole('button', { name: label }).className
    );
    for (const className of positive) {
      expect(className).toContain('bg-unlocked');
    }
    // all three "recognized it" outcomes share the exact same color — none
    // differs from the others, per the design doc's two-color split.
    expect(positive[0]).toBe(positive[1]);
    expect(positive[1]).toBe(positive[2]);
  });

  // bg-practicing is a light fill — text-paper fails WCAG contrast at this
  // size (~2.7:1 in light mode); text-ink passes (~5.0:1).
  test('"Again" uses text-ink for sufficient contrast against the practicing fill, not text-paper', () => {
    render(<RatingButtons onRate={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Again' }).className).not.toContain('text-paper');
  });
});
