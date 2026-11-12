import { test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getAndMaybeUnlockGateStatus } from './gateService';
import { createCardIfMissing, getCard, upsertCard } from '@/lib/store/cardStore';
import { isSectionUnlocked } from '@/lib/store/learnerStore';
import type { Grade } from '@/lib/types';

let tmp: string;
let originalDataDir: string | undefined;

beforeEach(() => {
  originalDataDir = process.env.WORDBOOK_DATA_DIR;
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wordbook-gateservice-'));
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

function gradeAll(sectionId: string, grades: Record<string, Grade>): void {
  for (const [token, grade] of Object.entries(grades)) {
    createCardIfMissing(sectionId, token);
    upsertCard({ ...getCard(sectionId, token)!, lastGrade: grade });
  }
}

test('grading a section to a passing rate unlocks it (regression: gate page never unlocked)', () => {
  // 4 of 5 recognized = 80%, exactly the threshold.
  gradeAll('sec-1', { burro: 'good', luna: 'easy', campo: 'hard', flor: 'good', rio: 'again' });
  expect(isSectionUnlocked('sec-1')).toBe(false);

  const status = getAndMaybeUnlockGateStatus('sec-1');

  expect(status).toMatchObject({ recognizedCount: 4, totalCount: 5, passed: true });
  expect(isSectionUnlocked('sec-1')).toBe(true);
});

test('a failing rate does not unlock the section', () => {
  gradeAll('sec-2', { burro: 'good', luna: 'again', campo: 'again' });

  const status = getAndMaybeUnlockGateStatus('sec-2');

  expect(status.passed).toBe(false);
  expect(isSectionUnlocked('sec-2')).toBe(false);
});

test('a section with no cards auto-passes and is unlocked', () => {
  const status = getAndMaybeUnlockGateStatus('sec-empty');

  expect(status.passed).toBe(true);
  expect(isSectionUnlocked('sec-empty')).toBe(true);
});
