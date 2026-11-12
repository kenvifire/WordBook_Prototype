import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { withCache } from './cache';

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wordbook-ai-cache-'));
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('withCache computes once and serves the cached value on the second call', async () => {
  const compute = vi.fn().mockResolvedValue({ value: 42 });
  const first = await withCache('k1', compute, { cacheDir: tmp });
  const second = await withCache('k1', compute, { cacheDir: tmp });
  expect(first).toEqual({ value: 42 });
  expect(second).toEqual({ value: 42 });
  expect(compute).toHaveBeenCalledTimes(1);
});

test('a rejected compute is not cached', async () => {
  const compute = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ value: 1 });
  await expect(withCache('k2', compute, { cacheDir: tmp })).rejects.toThrow('boom');
  await expect(withCache('k2', compute, { cacheDir: tmp })).resolves.toEqual({ value: 1 });
});
