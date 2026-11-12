import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readJson, writeJson } from './jsonStore';

let tmp: string;
let originalDataDir: string | undefined;

beforeEach(() => {
  originalDataDir = process.env.WORDBOOK_DATA_DIR;
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wordbook-jsonstore-'));
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

test('readJson returns the fallback when the file is missing', () => {
  expect(readJson(path.join(tmp, 'x.json'), { a: 1 })).toEqual({ a: 1 });
});

test('writeJson then readJson round-trips and creates missing directories', () => {
  const file = path.join(tmp, 'nested', 'dir', 'x.json');
  writeJson(file, { a: 2 });
  expect(readJson(file, {})).toEqual({ a: 2 });
});
