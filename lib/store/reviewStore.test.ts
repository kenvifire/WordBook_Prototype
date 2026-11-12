import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { appendReview, getReviewsForCard } from './reviewStore';

let tmp: string;
let originalDataDir: string | undefined;

beforeEach(() => {
  originalDataDir = process.env.WORDBOOK_DATA_DIR;
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wordbook-reviewstore-'));
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

test('appendReview and getReviewsForCard round-trip in order', () => {
  appendReview({ cardId: 'sec-1:burro', grade: 'good', gradedAt: '2026-01-01T00:00:00.000Z' });
  appendReview({ cardId: 'sec-1:burro', grade: 'easy', gradedAt: '2026-01-02T00:00:00.000Z' });
  expect(getReviewsForCard('sec-1:burro').map(r => r.grade)).toEqual(['good', 'easy']);
});
