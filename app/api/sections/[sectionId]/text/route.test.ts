import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GET } from './route';
import { unlockSection } from '@/lib/store/learnerStore';

let tmp: string;
let originalDataDir: string | undefined;

beforeEach(() => {
  originalDataDir = process.env.WORDBOOK_DATA_DIR;
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wordbook-textroute-'));
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

test('returns 200 with section text once unlocked', async () => {
  unlockSection('platero-y-yo-0');

  const response = await GET(new Request('http://localhost/api/sections/platero-y-yo-0/text'), {
    params: Promise.resolve({ sectionId: 'platero-y-yo-0' }),
  });

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.sectionId).toBe('platero-y-yo-0');
  expect(typeof body.title).toBe('string');
  expect(typeof body.text).toBe('string');
});

test('returns 403 locked when the section has not been unlocked', async () => {
  const response = await GET(new Request('http://localhost/api/sections/platero-y-yo-0/text'), {
    params: Promise.resolve({ sectionId: 'platero-y-yo-0' }),
  });

  expect(response.status).toBe(403);
  await expect(response.json()).resolves.toEqual({ error: 'locked' });
});

test('returns 403 locked (not 404) for an unlocked-but-nonexistent section, since the lock check runs first', async () => {
  const response = await GET(new Request('http://localhost/api/sections/does-not-exist/text'), {
    params: Promise.resolve({ sectionId: 'does-not-exist' }),
  });

  expect(response.status).toBe(403);
});
