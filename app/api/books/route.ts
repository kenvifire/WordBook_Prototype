import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseEpub } from '@/lib/epub/parseEpub';
import { addBook } from '@/lib/books/bookService';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  let title: string;
  let author: string | undefined;
  let rawText: string;
  let format: 'text' | 'epub';

  if (file instanceof File) {
    if (!file.name.toLowerCase().endsWith('.epub')) {
      return NextResponse.json(
        { error: 'Uploaded file must be an .epub file' },
        { status: 400 }
      );
    }

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

    // Storage is for record-keeping only, not a hard dependency of success: the
    // book has already been parsed, so a storage failure here is logged, not fatal.
    const { error: uploadError } = await supabase.storage
      .from('epubs')
      .upload(`${user.id}/${randomUUID()}.epub`, buffer, {
        contentType: 'application/epub+zip',
      });

    if (uploadError) {
      console.error('Failed to upload EPUB to storage:', uploadError.message);
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

  const { bookId } = await addBook(supabase, {
    title,
    author,
    format,
    rawText,
    userId: user.id,
  });

  return NextResponse.json({ bookId }, { status: 201 });
}
