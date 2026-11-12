import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const replace = vi.fn();
const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push }),
}));

import { StudySession } from './StudySession';
import type { DeckWord } from '@/lib/services/deckService';

afterEach(cleanup);

beforeEach(() => {
  replace.mockClear();
  push.mockClear();
});

test('an empty deck redirects to the gate page instead of leaving a dead end', () => {
  render(<StudySession sectionId="sec-1" deck={{ sectionId: 'sec-1', words: [] }} />);
  expect(replace).toHaveBeenCalledWith('/sections/sec-1/gate');
});

test("a non-empty deck shows the first card with the AI's reason for picking it", () => {
  const word: DeckWord = {
    token: 'burro',
    sentence: 'El burro camina.',
    definitionEn: 'donkey',
    translationEn: 'donkey',
    exampleEs: 'El burro es gris.',
    reason: 'central to the story',
    priorityScore: 0.9,
    card: {
      id: 'sec-1:burro',
      sectionId: 'sec-1',
      token: 'burro',
      easeFactor: 2.5,
      interval: 0,
      repetitions: 0,
      lastGrade: null,
      dueAt: new Date(0).toISOString(),
    },
  };
  render(<StudySession sectionId="sec-1" deck={{ sectionId: 'sec-1', words: [word] }} />);
  expect(screen.getByText('Why this word: central to the story')).toBeInTheDocument();
  expect(replace).not.toHaveBeenCalled();
});

test('advancing to the next card resets the revealed answer (regression: stale FlashcardView state across cards)', async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  const makeCard = (token: string) => ({
    id: `sec-1:${token}`,
    sectionId: 'sec-1',
    token,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    lastGrade: null,
    dueAt: new Date(0).toISOString(),
  });
  const words: DeckWord[] = [
    {
      token: 'burro',
      sentence: 'El burro camina.',
      definitionEn: 'donkey',
      translationEn: 'donkey',
      exampleEs: 'El burro es gris.',
      reason: 'first word',
      priorityScore: 0.9,
      card: makeCard('burro'),
    },
    {
      token: 'luna',
      sentence: 'La luna brilla.',
      definitionEn: 'moon',
      translationEn: 'moon',
      exampleEs: 'La luna es blanca.',
      reason: 'second word',
      priorityScore: 0.8,
      card: makeCard('luna'),
    },
  ];
  const user = userEvent.setup();
  render(<StudySession sectionId="sec-1" deck={{ sectionId: 'sec-1', words }} />);

  await user.click(screen.getByRole('button', { name: /show answer/i }));
  expect(screen.getByText('donkey')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /^good$/i }));

  // The second card must start hidden again, not carry over "revealed" from the first.
  expect(screen.getByText('Why this word: second word')).toBeInTheDocument();
  expect(screen.queryByText('moon')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /show answer/i })).toBeInTheDocument();
});
