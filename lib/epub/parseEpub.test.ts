// @vitest-environment node
// EPUB parsing uses zlib/zip decompression under the hood, which misbehaves under
// jsdom (the project's default test environment) — run this file in a plain node
// environment instead.
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEpub } from './parseEpub';

describe('parseEpub', () => {
  test('parses a valid EPUB into title, author, and flattened chapter text', async () => {
    const buffer = readFileSync(join(__dirname, 'fixtures/sample.epub'));
    const result = await parseEpub(buffer);
    expect(result.title).toBeTruthy();
    expect(result.text.length).toBeGreaterThan(0);
  });

  test('rejects on a non-EPUB buffer instead of hanging or crashing the process', async () => {
    await expect(parseEpub(Buffer.from('not an epub'))).rejects.toThrow();
  });
});
