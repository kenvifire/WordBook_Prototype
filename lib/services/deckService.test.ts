import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

vi.mock('@/lib/ai/client', () => ({
  createOpenAIClient: vi.fn(() => ({ complete: vi.fn() })),
}));
vi.mock('@/lib/ai/prioritize', () => ({
  prioritizeWords: vi.fn(),
}));
vi.mock('@/lib/ai/contextSense', () => ({
  getContextSense: vi.fn(),
}));

import { buildDeck } from './deckService';
import { prioritizeWords } from '@/lib/ai/prioritize';
import { getContextSense } from '@/lib/ai/contextSense';

let tmp: string;
let originalDataDir: string | undefined;

beforeEach(() => {
  originalDataDir = process.env.WORDBOOK_DATA_DIR;
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wordbook-deckservice-'));
  process.env.WORDBOOK_DATA_DIR = tmp;
  vi.clearAllMocks();
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
  if (originalDataDir === undefined) {
    delete process.env.WORDBOOK_DATA_DIR;
  } else {
    process.env.WORDBOOK_DATA_DIR = originalDataDir;
  }
});

test('buildDeck merges prioritized words, context sense, and a card into DeckWord[]', async () => {
  vi.mocked(prioritizeWords).mockResolvedValue([
    { token: 'platero', sentence: 'PLATERO es pequeño.', occurrences: 3, reason: 'frequent and central', priorityScore: 9.5 },
  ]);
  vi.mocked(getContextSense).mockResolvedValue({
    token: 'platero',
    sentence: 'PLATERO es pequeño.',
    definitionEn: 'a small donkey',
    translationEn: 'Platero',
    exampleEs: 'Platero es un burro.',
  });

  const deck = await buildDeck('platero-y-yo-0');

  expect(deck.sectionId).toBe('platero-y-yo-0');
  expect(deck.words).toHaveLength(1);
  const [word] = deck.words;
  expect(word).toMatchObject({
    token: 'platero',
    sentence: 'PLATERO es pequeño.',
    definitionEn: 'a small donkey',
    translationEn: 'Platero',
    exampleEs: 'Platero es un burro.',
    reason: 'frequent and central',
    priorityScore: 9.5,
  });
  expect(word.card).toMatchObject({
    id: 'platero-y-yo-0:platero',
    sectionId: 'platero-y-yo-0',
    token: 'platero',
    repetitions: 0,
    lastGrade: null,
  });
});

test('buildDeck throws for an unknown section', async () => {
  await expect(buildDeck('nonexistent-section-999')).rejects.toThrow();
});
