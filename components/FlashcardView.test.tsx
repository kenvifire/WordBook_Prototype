import { test, expect, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FlashcardView } from './FlashcardView';

afterEach(cleanup);

const word = {
  token: 'burro',
  sentence: 'El burro camina.',
  definitionEn: 'donkey',
  translationEn: 'donkey',
  exampleEs: 'El burro es gris.',
  reason: 'frequent and central to the story',
};

test('FlashcardView reveals the answer and reports the selected grade', async () => {
  const onGrade = vi.fn();
  render(<FlashcardView word={word} onGrade={onGrade} />);
  expect(screen.queryByText('donkey')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /show answer/i }));
  expect(screen.getByText('donkey')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /^good$/i }));
  expect(onGrade).toHaveBeenCalledWith('good');
});

test("FlashcardView shows the AI's reason for picking the word without any extra click", () => {
  render(<FlashcardView word={word} onGrade={vi.fn()} />);
  expect(screen.getByText('Why this word: frequent and central to the story')).toBeInTheDocument();
});
