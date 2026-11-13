import { EPub } from 'epub2';
import type { TocElement } from 'epub2/lib/epub/const';
import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export type ParsedEpub = {
  title: string;
  author: string | null;
  text: string;
};

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ');
}

// EPUB chapter HTML commonly contains named entities instead of the literal
// character (curly quotes, non-breaking spaces, dashes). Left undecoded,
// these leak into the reader as literal "&nbsp;" text and into
// extractVocabulary's tokenizer as junk words ("nbsp", "rsquo", "mdash").
// Not a full HTML-entity library — just the handful that show up in real
// book text.
const HTML_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&mdash;': '—',
  '&ndash;': '–',
  '&rsquo;': '’',
  '&lsquo;': '‘',
  '&rdquo;': '”',
  '&ldquo;': '“',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&#39;': "'",
  '&quot;': '"',
};

function decodeEntities(html: string): string {
  return html.replace(/&[a-zA-Z#0-9]+;/g, (entity) => HTML_ENTITIES[entity] ?? entity);
}

export async function parseEpub(buffer: Buffer): Promise<ParsedEpub> {
  const tempPath = join(tmpdir(), `wordbook-upload-${randomUUID()}.epub`);
  await writeFile(tempPath, buffer);

  try {
    const epub = await EPub.createAsync(tempPath);

    const chapterTexts = await Promise.all(
      epub.flow.map((chapter: TocElement) => {
        if (!chapter.id) return Promise.resolve('');
        return epub.getChapterAsync(chapter.id);
      })
    );

    const text = chapterTexts
      .map(stripTags)
      .map(decodeEntities)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      title: epub.metadata.title ?? 'Untitled',
      author: epub.metadata.creator ?? null,
      text,
    };
  } catch (err) {
    throw new Error('Could not parse EPUB file', { cause: err });
  } finally {
    await unlink(tempPath).catch(() => {});
  }
}
