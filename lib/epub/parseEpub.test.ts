// @vitest-environment node
// EPUB parsing uses zlib/zip decompression under the hood, which misbehaves under
// jsdom (the project's default test environment) — run this file in a plain node
// environment instead.
import { describe, test, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEpub } from './parseEpub';
import { extractVocabulary } from '../text/extractVocabulary';

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

  test('falls back to a non-null placeholder title when EPUB metadata has none', async () => {
    vi.resetModules();
    vi.doMock('epub2', () => ({
      EPub: {
        createAsync: vi.fn().mockResolvedValue({
          metadata: { title: undefined, creator: undefined },
          flow: [],
        }),
      },
    }));

    const { parseEpub: parseEpubWithMock } = await import('./parseEpub');
    const result = await parseEpubWithMock(Buffer.from('irrelevant'));

    expect(result.title).toBe('Untitled');
    expect(result.title).not.toBeNull();
    expect(result.author).toBeNull();

    vi.doUnmock('epub2');
    vi.resetModules();
  });

  test('I2: decodes HTML entities so they do not leak literally into the text or as junk vocabulary', async () => {
    vi.resetModules();
    vi.doMock('epub2', () => ({
      EPub: {
        createAsync: vi.fn().mockResolvedValue({
          metadata: { title: 'Entities Test', creator: 'Author' },
          flow: [{ id: 'ch1' }],
          getChapterAsync: vi
            .fn()
            .mockResolvedValue(
              '<p>Alchemist&nbsp;&mdash;it&rsquo;s a &ldquo;grove&rdquo; &amp; garden.</p>'
            ),
        }),
      },
    }));

    const { parseEpub: parseEpubWithMock } = await import('./parseEpub');
    const result = await parseEpubWithMock(Buffer.from('irrelevant'));

    expect(result.text).not.toContain('&nbsp;');
    expect(result.text).not.toContain('&mdash;');
    expect(result.text).not.toContain('&rsquo;');
    expect(result.text).not.toContain('&ldquo;');
    expect(result.text).not.toContain('&rdquo;');
    expect(result.text).not.toContain('&amp;');

    const vocabulary = extractVocabulary(result.text);
    expect(vocabulary).not.toContain('nbsp');
    expect(vocabulary).not.toContain('mdash');
    expect(vocabulary).not.toContain('rsquo');
    expect(vocabulary).not.toContain('ldquo');
    expect(vocabulary).not.toContain('rdquo');
    expect(vocabulary).not.toContain('amp');

    vi.doUnmock('epub2');
    vi.resetModules();
  });
});
