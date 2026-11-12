import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

vi.mock('@/lib/translate/mymemory', () => ({
  translateWord: vi.fn(),
}));

import { POST } from './route';
import { translateWord } from '@/lib/translate/mymemory';
import { getCard } from '@/lib/store/cardStore';

let tmp: string;
let originalDataDir: string | undefined;

beforeEach(() => {
  originalDataDir = process.env.WORDBOOK_DATA_DIR;
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wordbook-taproute-'));
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

test('translates the token, creates a card, and returns both', async () => {
  vi.mocked(translateWord).mockResolvedValue({ translatedText: 'donkey' });

  const response = await POST(
    new Request('http://localhost/api/words/tap', {
      method: 'POST',
      body: JSON.stringify({ sectionId: 'sec-1', token: 'Burro', sentence: 'El Burro camina.' }),
    })
  );

  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.translation).toBe('donkey');
  expect(body.card).toMatchObject({ id: 'sec-1:burro', sectionId: 'sec-1', token: 'burro' });
  expect(getCard('sec-1', 'burro')).toBeDefined();
  expect(translateWord).toHaveBeenCalledWith('Burro');
});

test('is idempotent: tapping the same word twice does not reset its card', async () => {
  vi.mocked(translateWord).mockResolvedValue({ translatedText: 'donkey' });

  await POST(
    new Request('http://localhost/api/words/tap', {
      method: 'POST',
      body: JSON.stringify({ sectionId: 'sec-1', token: 'burro', sentence: 'El burro camina.' }),
    })
  );
  const first = getCard('sec-1', 'burro');
  expect(first).toBeDefined();

  const response = await POST(
    new Request('http://localhost/api/words/tap', {
      method: 'POST',
      body: JSON.stringify({ sectionId: 'sec-1', token: 'burro', sentence: 'Otro burro.' }),
    })
  );
  const body = await response.json();
  expect(body.card).toEqual(first);
});
