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

    render(
      <WordPopup word="ephemeral" language="english" bookId="book-1" sectionId="section-1" />
    );

    await user.click(screen.getByText('ephemeral'));

    expect(fetch).toHaveBeenCalledWith(
      '/api/words/lookup',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          word: 'ephemeral',
          add: false,
          language: 'english',
          bookId: 'book-1',
          sectionId: 'section-1',
        }),
      })
    );

    expect(await screen.findByText('lasting a short time')).toBeInTheDocument();
    expect(screen.queryByText('Added ✓')).not.toBeInTheDocument();
  });

  test('WordPopup sends the language prop in the lookup request body', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ word: 'chat', definition: 'a cat' }),
    });
    const user = userEvent.setup();

    render(<WordPopup word="chat" language="french" bookId="book-1" sectionId="section-1" />);

    await user.click(screen.getByText('chat'));

    expect(fetch).toHaveBeenCalledWith(
      '/api/words/lookup',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          word: 'chat',
          add: false,
          language: 'french',
          bookId: 'book-1',
          sectionId: 'section-1',
        }),
      })
    );
  });

  test('I1: WordPopup sends bookId/sectionId props in the lookup request body', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ word: 'wistful', definition: 'full of yearning' }),
    });
    const user = userEvent.setup();

    render(
      <WordPopup word="wistful" language="english" bookId="book-42" sectionId="section-7" />
    );

    await user.click(screen.getByText('wistful'));

    expect(fetch).toHaveBeenCalledWith(
      '/api/words/lookup',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          word: 'wistful',
          add: false,
          language: 'english',
          bookId: 'book-42',
          sectionId: 'section-7',
        }),
      })
    );
  });

  test('I4: clicking "Add to my vocabulary" actually posts an add request and only then shows Added', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ word: 'placid', definition: 'calm and peaceful' }),
    });
    const user = userEvent.setup();

    render(
      <WordPopup word="placid" language="english" bookId="book-1" sectionId="section-1" />
    );

    await user.click(screen.getByText('placid'));
    await screen.findByText('calm and peaceful');
    expect(screen.queryByText('Added ✓')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Add to my vocabulary' }));

    expect(fetch).toHaveBeenCalledWith(
      '/api/words/lookup',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          word: 'placid',
          add: true,
          language: 'english',
          bookId: 'book-1',
          sectionId: 'section-1',
        }),
      })
    );
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(await screen.findByText('Added ✓')).toBeInTheDocument();
  });

  test('a failed lookup shows an error instead of a definition', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });
    const user = userEvent.setup();

    // A word no other test in this file uses: the session word cache
    // (lib/cache/clientWordCache.ts) is module-level state shared across
    // this file's tests, so reusing a word another test successfully looks
    // up would make this test pass or fail depending on test order.
    render(<WordPopup word="gossamer" language="english" bookId="book-1" sectionId="section-1" />);

    await user.click(screen.getByText('gossamer'));

    expect(await screen.findByText('Could not look up this word.')).toBeInTheDocument();
  });

  test('clicking the word again after it resolves does not re-fetch', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ word: 'lucid', definition: 'clear and easy to understand' }),
    });
    const user = userEvent.setup();

    render(<WordPopup word="lucid" language="english" bookId="book-1" sectionId="section-1" />);

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

    render(<WordPopup word="gloaming" language="english" bookId="book-1" sectionId="section-1" />);

    await user.click(screen.getByText('gloaming'));
    expect(await screen.findByText('twilight')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByText('twilight')).not.toBeInTheDocument();
  });

  test('does not re-fetch a word it already looked up this session, even from a fresh popup instance', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ word: 'mirthful', definition: 'full of merriment' }),
    });
    const user = userEvent.setup();

    const first = render(
      <WordPopup word="mirthful" language="english" bookId="book-1" sectionId="section-1" />
    );
    await user.click(first.getByText('mirthful'));
    expect(await first.findByText('full of merriment')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);

    // Close, then open again on the same instance — still no extra fetch.
    await user.click(first.getByRole('button', { name: 'Close' }));
    await user.click(first.getByText('mirthful'));
    expect(fetch).toHaveBeenCalledTimes(1);
    first.unmount();

    // A brand-new popup instance for the same word+language should hit the
    // session cache instead of re-fetching.
    const second = render(
      <WordPopup word="mirthful" language="english" bookId="book-2" sectionId="section-9" />
    );
    await user.click(second.getByText('mirthful'));
    expect(await second.findByText('full of merriment')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test('a definition cached as null is shown as "no definition available" without re-fetching', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ word: 'zephyr', definition: null }),
    });
    const user = userEvent.setup();

    const first = render(
      <WordPopup word="zephyr" language="english" bookId="book-1" sectionId="section-1" />
    );
    await user.click(first.getByText('zephyr'));
    expect(await first.findByText('No definition available.')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
    first.unmount();

    const second = render(
      <WordPopup word="zephyr" language="english" bookId="book-2" sectionId="section-9" />
    );
    await user.click(second.getByText('zephyr'));
    expect(await second.findByText('No definition available.')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test('renders the definition in font-reading inside a bg-surface popover with a hairline border', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ word: 'umbrage', definition: 'a sense of offense' }),
    });
    const user = userEvent.setup();

    render(<WordPopup word="umbrage" language="english" bookId="book-1" sectionId="section-1" />);
    await user.click(screen.getByText('umbrage'));

    const definition = await screen.findByText('a sense of offense');
    expect(definition.className).toContain('font-reading');

    const popover = definition.closest('span.absolute');
    expect(popover?.className).toContain('bg-surface');
    expect(popover?.className).toContain('border-hairline');
  });

  test('the tapped word gets a practicing-colored underline while the popover is open', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ word: 'diaphanous', definition: 'light and translucent' }),
    });
    const user = userEvent.setup();

    render(
      <WordPopup word="diaphanous" language="english" bookId="book-1" sectionId="section-1" />
    );

    const wordButton = screen.getByRole('button', { name: 'diaphanous' });
    expect(wordButton.className).not.toContain('practicing');

    await user.click(wordButton);
    await screen.findByText('light and translucent');
    expect(wordButton.className).toContain('practicing');

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(wordButton.className).not.toContain('practicing');
  });

  test('the "Add to my vocabulary" button uses the unlocked color, not the neutral ink pattern', async () => {
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ word: 'tranquil', definition: 'calm and quiet' }),
    });
    const user = userEvent.setup();

    render(<WordPopup word="tranquil" language="english" bookId="book-1" sectionId="section-1" />);
    await user.click(screen.getByText('tranquil'));
    await screen.findByText('calm and quiet');

    const addButton = screen.getByRole('button', { name: 'Add to my vocabulary' });
    expect(addButton.className).toContain('bg-unlocked');
    expect(addButton.className).not.toContain('bg-ink');
  });
});
