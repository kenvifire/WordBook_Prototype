import { test, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WordPopover } from './WordPopover';

afterEach(cleanup);

test('WordPopover fetches and shows a translation, then closes', async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ translation: 'donkey', card: { id: 'x' } }) });
  const onClose = vi.fn();
  render(<WordPopover sectionId="sec-1" token="burro" sentence="El burro camina." onClose={onClose} />);
  expect(await screen.findByText('donkey')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /close/i }));
  expect(onClose).toHaveBeenCalled();
});

test('WordPopover confirms the tapped word was added to the review queue', async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ translation: 'donkey', card: { id: 'sec-1:burro' } }) });
  render(<WordPopover sectionId="sec-1" token="burro" sentence="El burro camina." onClose={vi.fn()} />);
  expect(await screen.findByText('Added to your review queue')).toBeInTheDocument();
  expect(screen.getByText('donkey')).toBeInTheDocument();
});

test('WordPopover does not claim the word was added when the tap request fails', async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ translation: 'donkey' }) });
  render(<WordPopover sectionId="sec-1" token="burro" sentence="El burro camina." onClose={vi.fn()} />);
  expect(await screen.findByText('donkey')).toBeInTheDocument();
  expect(screen.queryByText('Added to your review queue')).not.toBeInTheDocument();
});
