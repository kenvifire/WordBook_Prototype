import { test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import GatePage from './page';
import { createCardIfMissing, upsertCard } from '@/lib/store/cardStore';
import { isSectionUnlocked } from '@/lib/store/learnerStore';

let tmp: string;
let originalDataDir: string | undefined;

beforeEach(() => {
  originalDataDir = process.env.WORDBOOK_DATA_DIR;
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wordbook-gatepage-'));
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

test('rendering the gate page for a passing section unlocks it (regression: study -> gate -> read loop)', async () => {
  const card = createCardIfMissing('sec-1', 'burro');
  upsertCard({ ...card, lastGrade: 'good' });

  await GatePage({ params: Promise.resolve({ sectionId: 'sec-1' }) });

  expect(isSectionUnlocked('sec-1')).toBe(true);
});
