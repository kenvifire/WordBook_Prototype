import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import DeleteBookButton from './DeleteBookButton';

beforeEach(() => {
  mockPush.mockReset();
  global.fetch = vi.fn();
});

describe('DeleteBookButton', () => {
  test('shows a delete button, using the error design token rather than an ad-hoc red', () => {
    render(<DeleteBookButton bookId="book-1" />);

    const button = screen.getByRole('button', { name: 'Delete book' });
    expect(button.className).toContain('text-error');
    expect(button.className).not.toContain('bg-red');
  });

  test('clicking Delete book shows a confirm step instead of calling the API immediately', async () => {
    const user = userEvent.setup();
    render(<DeleteBookButton bookId="book-1" />);

    await user.click(screen.getByRole('button', { name: 'Delete book' }));

    expect(screen.getByRole('button', { name: 'Yes, delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('clicking Cancel returns to the initial state without calling the API', async () => {
    const user = userEvent.setup();
    render(<DeleteBookButton bookId="book-1" />);

    await user.click(screen.getByRole('button', { name: 'Delete book' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('button', { name: 'Delete book' })).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('confirming calls DELETE on the book and redirects to /bookshelf on success', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
    render(<DeleteBookButton bookId="book-1" />);

    await user.click(screen.getByRole('button', { name: 'Delete book' }));
    await user.click(screen.getByRole('button', { name: 'Yes, delete' }));

    expect(global.fetch).toHaveBeenCalledWith('/api/books/book-1', { method: 'DELETE' });
    expect(mockPush).toHaveBeenCalledWith('/bookshelf');
  });

  test('shows an error and does not redirect when the delete request fails', async () => {
    const user = userEvent.setup();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });
    render(<DeleteBookButton bookId="book-1" />);

    await user.click(screen.getByRole('button', { name: 'Delete book' }));
    await user.click(screen.getByRole('button', { name: 'Yes, delete' }));

    expect(await screen.findByText('Failed to delete book')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
