import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getKnownWords, markWordsKnown, isSectionUnlocked, unlockSection } from './learnerStore';

let tmp: string;
let originalDataDir: string | undefined;

beforeEach(() => {
  originalDataDir = process.env.WORDBOOK_DATA_DIR;
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wordbook-learnerstore-'));
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

test('known words start empty and accumulate as a deduped union', () => {
  expect(getKnownWords()).toEqual([]);
  markWordsKnown(['burro', 'luna']);
  markWordsKnown(['luna', 'cielo']);
  expect(getKnownWords().sort()).toEqual(['burro', 'cielo', 'luna']);
});

test('sections start locked until explicitly unlocked', () => {
  expect(isSectionUnlocked('sec-2')).toBe(false);
  unlockSection('sec-2');
  expect(isSectionUnlocked('sec-2')).toBe(true);
});
