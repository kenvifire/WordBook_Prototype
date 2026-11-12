import { test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WordPopover } from './WordPopover';

test('WordPopover fetches and shows a translation, then closes', async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ translation: 'donkey', card: { id: 'x' } }) });
  const onClose = vi.fn();
  render(<WordPopover sectionId="sec-1" token="burro" sentence="El burro camina." onClose={onClose} />);
  expect(await screen.findByText('donkey')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /close/i }));
  expect(onClose).toHaveBeenCalled();
});
