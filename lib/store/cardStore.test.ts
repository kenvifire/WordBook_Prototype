import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getCard, getCardsForSection, upsertCard, createCardIfMissing } from './cardStore';

let tmp: string;
let originalDataDir: string | undefined;

beforeEach(() => {
  originalDataDir = process.env.WORDBOOK_DATA_DIR;
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wordbook-cardstore-'));
  process.env.WORDBOOK_DATA_DIR = tmp;
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
  if (originalDataDir === undefined) {
    delete process.env.WORDBOOK_DATA_DIR;
  } else {
    process.env.WORDBOOK_DATA_DIR = originalDataDir;
  }
});

test('createCardIfMissing creates an initial-state card and persists it', () => {
  const card = createCardIfMissing('sec-1', 'burro');
  expect(card).toMatchObject({ id: 'sec-1:burro', sectionId: 'sec-1', token: 'burro', easeFactor: 2.5, interval: 0, repetitions: 0, lastGrade: null });
  expect(getCard('sec-1', 'burro')).toEqual(card);
});

test('createCardIfMissing is idempotent and getCardsForSection filters by section', () => {
  const first = createCardIfMissing('sec-1', 'burro');
  upsertCard({ ...first, repetitions: 3 });
  expect(createCardIfMissing('sec-1', 'burro').repetitions).toBe(3);
  createCardIfMissing('sec-2', 'luna');
  expect(getCardsForSection('sec-1').map(c => c.token)).toEqual(['burro']);
});
