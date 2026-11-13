import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockRefresh = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, push: mockPush }),
}));

import AddBookForm from './AddBookForm';

function mockFetchOnce(response: { ok: boolean; json: () => Promise<unknown> }) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(response);
}

beforeEach(() => {
  mockRefresh.mockReset();
  mockPush.mockReset();
  global.fetch = vi.fn();
});

afterEach(() => {
  cleanup();
});

describe('AddBookForm', () => {
  test('submitting pasted text posts a multipart form with title, format=text, rawText', async () => {
    mockFetchOnce({ ok: true, json: async () => ({ bookId: 'book-1' }) });

    const user = userEvent.setup();
    render(<AddBookForm />);

    await user.type(screen.getByLabelText(/title/i), 'My Book');
    await user.type(screen.getByLabelText(/^text$/i), 'Once upon a time');
    await user.click(screen.getByRole('button', { name: /add book/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/api/books');
    expect(init.method).toBe('POST');

    const body = init.body as FormData;
    expect(body.get('title')).toBe('My Book');
    expect(body.get('format')).toBe('text');
    expect(body.get('rawText')).toBe('Once upon a time');
    expect(body.get('file')).toBeNull();

    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
  });

  test('choosing a file switches the form to upload mode and posts format based on file extension', async () => {
    mockFetchOnce({ ok: true, json: async () => ({ bookId: 'book-2' }) });

    const user = userEvent.setup();
    render(<AddBookForm />);

    await user.click(screen.getByRole('button', { name: /upload file/i }));
    await user.type(screen.getByLabelText(/title/i), 'Epub Book');

    const epubFile = new File(['epub contents'], 'book.epub', {
      type: 'application/epub+zip',
    });
    const fileInput = screen.getByLabelText(/^file$/i);
    await user.upload(fileInput, epubFile);
    await user.click(screen.getByRole('button', { name: /add book/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const body1 = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as FormData;
    expect(body1.get('format')).toBe('epub');
    expect(body1.get('file')).toBeInstanceOf(File);
    expect(body1.get('rawText')).toBeNull();

    mockFetchOnce({ ok: true, json: async () => ({ bookId: 'book-3' }) });
    const txtFile = new File(['text contents'], 'book.txt', { type: 'text/plain' });
    await user.upload(fileInput, txtFile);
    await user.click(screen.getByRole('button', { name: /add book/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    const body2 = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[1][1].body as FormData;
    expect(body2.get('format')).toBe('text');
    expect(body2.get('file')).toBeInstanceOf(File);
  });

  test('shows the API error message when the POST fails', async () => {
    mockFetchOnce({ ok: false, json: async () => ({ error: 'Something went wrong' }) });

    const user = userEvent.setup();
    render(<AddBookForm />);

    await user.type(screen.getByLabelText(/title/i), 'My Book');
    await user.type(screen.getByLabelText(/^text$/i), 'Some text');
    await user.click(screen.getByRole('button', { name: /add book/i }));

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
