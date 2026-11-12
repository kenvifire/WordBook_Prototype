import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GET } from './route';
import { createCardIfMissing, upsertCard } from '@/lib/store/cardStore';
import { isSectionUnlocked } from '@/lib/store/learnerStore';

let tmp: string;
let originalDataDir: string | undefined;

beforeEach(() => {
  originalDataDir = process.env.WORDBOOK_DATA_DIR;
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wordbook-gateroute-'));
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

test('unlocks the section and reports unlocked:true when the gate passes', async () => {
  const card = createCardIfMissing('sec-1', 'burro');
  upsertCard({ ...card, lastGrade: 'good' });

  const response = await GET(new Request('http://localhost/api/sections/sec-1/gate'), {
    params: Promise.resolve({ sectionId: 'sec-1' }),
  });

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.passed).toBe(true);
  expect(body.unlocked).toBe(true);
  expect(isSectionUnlocked('sec-1')).toBe(true);
});

test('does not unlock the section when the gate fails', async () => {
  const card = createCardIfMissing('sec-2', 'burro');
  upsertCard({ ...card, lastGrade: 'again' });

  const response = await GET(new Request('http://localhost/api/sections/sec-2/gate'), {
    params: Promise.resolve({ sectionId: 'sec-2' }),
  });

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.passed).toBe(false);
  expect(body.unlocked).toBe(false);
  expect(isSectionUnlocked('sec-2')).toBe(false);
});
