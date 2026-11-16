import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from 'firebase-admin/storage';
import { getAdminApp } from '@/lib/firebase/admin';
import { getAuthedUser } from '@/lib/firebase/server';
import { parseEpub } from '@/lib/epub/parseEpub';
import { parsePdf } from '@/lib/pdf/parsePdf';
import { addBook } from '@/lib/books/bookService';

export async function POST(request: NextRequest) {
  const user = await getAuthedUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  let title: string;
  let author: string | undefined;
  let rawText: string;
  let format: 'text' | 'epub' | 'pdf';
  let chapterTitles: string[] | undefined;

  if (file instanceof File) {
    const lowerName = file.name.toLowerCase();

    if (lowerName.endsWith('.epub')) {
      format = 'epub';
      const buffer = Buffer.from(await file.arrayBuffer());

      let parsed;
      try {
        parsed = await parseEpub(buffer);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not parse EPUB file';
        return NextResponse.json({ error: message }, { status: 400 });
      }

      title = parsed.title;
      author = parsed.author ?? undefined;
      rawText = parsed.text;
      chapterTitles = parsed.chapterTitles ?? undefined;

      // Storage is for record-keeping only, not a hard dependency of success: the
      // book has already been parsed, so a storage failure here is logged, not fatal.
      try {
        await getStorage(getAdminApp())
          .bucket()
          .file(`epubs/${user.uid}/${randomUUID()}.epub`)
          .save(buffer, { contentType: 'application/epub+zip' });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown storage error';
        console.error('Failed to upload EPUB to storage:', message);
      }
    } else if (lowerName.endsWith('.pdf')) {
      format = 'pdf';
      const buffer = Buffer.from(await file.arrayBuffer());

      let parsed;
      try {
        parsed = await parsePdf(buffer);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not parse PDF file';
        return NextResponse.json({ error: message }, { status: 400 });
      }

      // pdfjs extracts no title/author metadata here (ParsedPdf carries
      // only text/pageTexts/outline), so — unlike the epub branch — the
      // title comes from the form field the client always sends.
      title = String(formData.get('title') ?? '');
      author = undefined;
      rawText = parsed.text;
      chapterTitles = parsed.outline ?? undefined;
    } else {
      return NextResponse.json(
        { error: 'Uploaded file must be an .epub file' },
        { status: 400 }
      );
    }
  } else {
    format = 'text';
    title = String(formData.get('title') ?? '');
    const authorField = formData.get('author');
    author = typeof authorField === 'string' && authorField.length > 0 ? authorField : undefined;
    rawText = String(formData.get('rawText') ?? '');

    if (title.trim().length === 0 || rawText.trim().length === 0) {
      return NextResponse.json(
        { error: 'title and rawText are required' },
        { status: 400 }
      );
    }
  }

  const { bookId } = await addBook({
    title,
    author,
    format,
    rawText,
    userId: user.uid,
    chapterTitles,
  });

  return NextResponse.json({ bookId }, { status: 201 });
}
