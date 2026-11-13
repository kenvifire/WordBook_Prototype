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

    const text = chapterTexts.map(stripTags).join(' ').replace(/\s+/g, ' ').trim();

    return {
      title: epub.metadata.title ?? '',
      author: epub.metadata.creator ?? null,
      text,
    };
  } catch {
    throw new Error('Could not parse EPUB file');
  } finally {
    await unlink(tempPath).catch(() => {});
  }
}
