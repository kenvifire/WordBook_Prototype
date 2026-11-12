import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

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
