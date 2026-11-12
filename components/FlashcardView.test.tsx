import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FlashcardView } from './FlashcardView';

test('FlashcardView reveals the answer and reports the selected grade', async () => {
  const onGrade = vi.fn();
  render(<FlashcardView word={{ token: 'burro', sentence: 'El burro camina.', definitionEn: 'donkey', translationEn: 'donkey', exampleEs: 'El burro es gris.' }} onGrade={onGrade} />);
  expect(screen.queryByText('donkey')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /show answer/i }));
  expect(screen.getByText('donkey')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /^good$/i }));
  expect(onGrade).toHaveBeenCalledWith('good');
});
