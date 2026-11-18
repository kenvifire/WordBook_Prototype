import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockRefresh = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, push: mockPush }),
}));

import GenerateBookForm from './GenerateBookForm';

function mockFetchOnce(response: { ok: boolean; json: () => Promise<unknown> }) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(response);
}

beforeEach(() => {
  mockRefresh.mockReset();
  mockPush.mockReset();
  global.fetch = vi.fn();
});

describe('GenerateBookForm', () => {
  test('submits topic/difficulty/language/targetWordCount and shows the new book as pending', async () => {
    mockFetchOnce({ ok: true, json: async () => ({ bookId: 'book-1' }) });

    const user = userEvent.setup();
    render(<GenerateBookForm />);

    await user.type(screen.getByLabelText(/topic/i), 'a mystery on a train');
    await user.type(screen.getByLabelText(/target language/i), 'spanish');
    await user.click(screen.getByRole('button', { name: /intermediate/i }));

    const wordCountInput = screen.getByLabelText(/number of words to learn/i);
    await user.clear(wordCountInput);
    await user.type(wordCountInput, '30');

    await user.click(screen.getByRole('button', { name: /generate book/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/api/books/generate');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });

    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      topic: 'a mystery on a train',
      difficulty: 'intermediate',
      language: 'spanish',
      targetWordCount: 30,
    });

    // The form's own job ends at kicking off generation and refreshing —
    // the Bookshelf server render is what actually shows the new book as
    // pending once it re-fetches (see app/bookshelf/page.test.tsx).
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
  });

  test('rejects a targetWordCount outside the 5-50 bound client-side, without calling fetch', async () => {
    const user = userEvent.setup();
    render(<GenerateBookForm />);

    await user.type(screen.getByLabelText(/topic/i), 'space adventure');
    await user.type(screen.getByLabelText(/target language/i), 'french');

    const wordCountInput = screen.getByLabelText(/number of words to learn/i);
    await user.clear(wordCountInput);
    await user.type(wordCountInput, '100');

    await user.click(screen.getByRole('button', { name: /generate book/i }));

    expect(await screen.findByText(/between 5 and 50/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('a non-ok response from the API surfaces the server error message instead of refreshing', async () => {
    mockFetchOnce({ ok: false, json: async () => ({ error: 'Invalid topic' }) });

    const user = userEvent.setup();
    render(<GenerateBookForm />);

    await user.type(screen.getByLabelText(/topic/i), 'x');
    await user.type(screen.getByLabelText(/target language/i), 'french');
    await user.click(screen.getByRole('button', { name: /generate book/i }));

    expect(await screen.findByText('Invalid topic')).toBeInTheDocument();
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  test('the selected difficulty chip uses bg-ink/text-paper, not a progress color', async () => {
    const user = userEvent.setup();
    render(<GenerateBookForm />);

    const intermediateChip = screen.getByRole('button', { name: /intermediate/i });
    await user.click(intermediateChip);

    expect(intermediateChip.className).toContain('bg-ink');
    expect(intermediateChip.className).not.toMatch(/bg-(locked|practicing|unlocked|error)\b/);

    const beginnerChip = screen.getByRole('button', { name: /beginner/i });
    expect(beginnerChip.className).toContain('bg-surface');
    expect(beginnerChip.className).toContain('border-hairline');
  });
});
