import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { POST } from './route';
import { createCardIfMissing } from '@/lib/store/cardStore';
import { getKnownWords } from '@/lib/store/learnerStore';
import { getReviewsForCard } from '@/lib/store/reviewStore';

let tmp: string;
let originalDataDir: string | undefined;

beforeEach(() => {
  originalDataDir = process.env.WORDBOOK_DATA_DIR;
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wordbook-reviewroute-'));
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

function makeRequest(grade: string): Request {
  return new Request('http://localhost/api/cards/sec-1:burro/review', {
    method: 'POST',
    body: JSON.stringify({ grade }),
  });
}

test('grades a pre-created card, marks the word known, and returns the card and gate', async () => {
  createCardIfMissing('sec-1', 'burro');

  const response = await POST(makeRequest('good'), {
    params: Promise.resolve({ cardId: 'sec-1:burro' }),
  });

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.card.repetitions).toBe(1);
  expect(body.card.lastGrade).toBe('good');
  expect(body.gate).toBeDefined();
  expect(body.gate.totalCount).toBe(1);
  expect(getKnownWords()).toContain('burro');
  expect(getReviewsForCard('sec-1:burro')).toHaveLength(1);
});

test('does not mark the word known on a grade of again', async () => {
  createCardIfMissing('sec-1', 'burro');

  await POST(makeRequest('again'), {
    params: Promise.resolve({ cardId: 'sec-1:burro' }),
  });

  expect(getKnownWords()).not.toContain('burro');
});

test('returns 404 when the card does not exist', async () => {
  const response = await POST(makeRequest('good'), {
    params: Promise.resolve({ cardId: 'sec-1:nonexistent' }),
  });

  expect(response.status).toBe(404);
  await expect(response.json()).resolves.toEqual({ error: 'not found' });
});

test('splits cardId on the LAST colon so a hyphenated sectionId is preserved', async () => {
  createCardIfMissing('platero-y-yo-0', 'burro');

  const response = await POST(
    new Request('http://localhost/api/cards/platero-y-yo-0:burro/review', {
      method: 'POST',
      body: JSON.stringify({ grade: 'easy' }),
    }),
    { params: Promise.resolve({ cardId: 'platero-y-yo-0:burro' }) }
  );

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.card.sectionId).toBe('platero-y-yo-0');
  expect(body.card.token).toBe('burro');
});
