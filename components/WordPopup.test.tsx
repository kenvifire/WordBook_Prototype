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

  test('I4: tapping a word looks it up read-only (add: false) and shows its definition without adding it', async () => {
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
        body: JSON.stringify({ word: 'ephemeral', add: false }),
      })
    );

    expect(await screen.findByText('lasting a short time')).toBeInTheDocument();
    expect(screen.queryByText('Added ✓')).not.toBeInTheDocument();
  });

  test('I4: clicking "Add to my vocabulary" actually posts an add request and only then shows Added', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ word: 'ephemeral', definition: 'lasting a short time' }),
    });
    const user = userEvent.setup();

    render(<WordPopup word="ephemeral" />);

    await user.click(screen.getByText('ephemeral'));
    await screen.findByText('lasting a short time');
    expect(screen.queryByText('Added ✓')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add to my vocabulary' }));

    expect(fetch).toHaveBeenCalledWith(
      '/api/words/lookup',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ word: 'ephemeral', add: true }),
      })
    );
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('Added ✓')).toBeInTheDocument();
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

  test('I5: a close button hides the popup', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ word: 'gloaming', definition: 'twilight' }),
    });
    const user = userEvent.setup();

    render(<WordPopup word="gloaming" />);

    await user.click(screen.getByText('gloaming'));
    expect(await screen.findByText('twilight')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByText('twilight')).not.toBeInTheDocument();
  });
});
