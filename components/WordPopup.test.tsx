import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import WordPopup from './WordPopup';

describe('WordPopup', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('clicking a word shows its definition once the lookup resolves, and an add-to-vocabulary confirmation after posting', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ word: 'ephemeral', definition: 'lasting a short time' }),
    });
    const user = userEvent.setup();

    render(<WordPopup word="ephemeral" />);

    await user.click(screen.getByText('ephemeral'));

    expect(fetch).toHaveBeenCalledWith(
      '/api/words/lookup',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ word: 'ephemeral' }),
      })
    );

    expect(await screen.findByText('lasting a short time')).toBeInTheDocument();
    expect(screen.queryByText('Added ✓')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add to my vocabulary' }));

    expect(screen.getByText('Added ✓')).toBeInTheDocument();
  });

  test('a failed lookup shows an error instead of a definition', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });
    const user = userEvent.setup();

    render(<WordPopup word="gloaming" />);

    await user.click(screen.getByText('gloaming'));

    expect(await screen.findByText('Could not look up this word.')).toBeInTheDocument();
  });

  test('clicking the word again after it resolves does not re-fetch', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ word: 'lucid', definition: 'clear and easy to understand' }),
    });
    const user = userEvent.setup();

    render(<WordPopup word="lucid" />);

    const wordButton = screen.getByRole('button', { name: 'lucid' });
    await user.click(wordButton);
    expect(await screen.findByText('clear and easy to understand')).toBeInTheDocument();

    await user.click(wordButton);

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
