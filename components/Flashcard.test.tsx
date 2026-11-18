import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Flashcard from './Flashcard';

const word = { id: 'word-1', word: 'ephemeral', definition: 'lasting a very short time' };

describe('Flashcard', () => {
  test('shows the word and a "Show definition" button, initially hiding the definition', () => {
    render(<Flashcard word={word} onRate={vi.fn()} />);

    expect(screen.getByText('ephemeral')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show definition' })).toBeInTheDocument();
    expect(screen.queryByText('lasting a very short time')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Rate your recall' })).not.toBeInTheDocument();
  });

  test('clicking "Show definition" reveals the definition text and the rating buttons', async () => {
    const user = userEvent.setup();
    render(<Flashcard word={word} onRate={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Show definition' }));

    expect(screen.getByText('lasting a very short time')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Rate your recall' })).toBeInTheDocument();
  });

  test('clicking a rating button calls onRate with that rating', async () => {
    const onRate = vi.fn();
    const user = userEvent.setup();
    render(<Flashcard word={word} onRate={onRate} />);

    await user.click(screen.getByRole('button', { name: 'Show definition' }));
    await user.click(screen.getByRole('button', { name: 'Good' }));

    expect(onRate).toHaveBeenCalledWith('good');
  });

  test('renders the word and definition in font-reading inside a bg-surface card', async () => {
    const user = userEvent.setup();
    render(<Flashcard word={word} onRate={vi.fn()} />);

    const card = screen.getByText('ephemeral').closest('div.flex.flex-col');
    expect(card?.className).toContain('bg-surface');
    expect(screen.getByText('ephemeral').className).toContain('font-reading');

    await user.click(screen.getByRole('button', { name: 'Show definition' }));

    expect(screen.getByText('lasting a very short time').className).toContain('font-reading');
  });
});
