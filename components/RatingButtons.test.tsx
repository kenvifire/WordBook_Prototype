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
});
