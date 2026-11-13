'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Mode = 'text' | 'file';

function isEpubFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.epub');
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export default function AddBookForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('text');
  const [title, setTitle] = useState('');
  const [rawText, setRawText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append('title', title);

    setSubmitting(true);
    try {
      if (mode === 'file' && file) {
        if (isEpubFile(file)) {
          formData.append('format', 'epub');
          formData.append('file', file);
        } else {
          formData.append('format', 'text');
          formData.append('rawText', await readFileAsText(file));
        }
      } else {
        formData.append('format', 'text');
        formData.append('rawText', rawText);
      }

      const res = await fetch('/api/books', { method: 'POST', body: formData });
      let data: { error?: string } = {};
      try {
        data = await res.json();
      } catch {
        // Response body may be empty; fall through to the generic error below.
      }

      if (!res.ok) {
        setError(data.error ?? 'Failed to add book');
        return;
      }

      setRawText('');
      setFile(null);
      router.refresh();
    } catch {
      setError('Failed to add book');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 flex flex-col gap-4 rounded border p-4"
    >
      <h2 className="text-lg font-semibold">Add a book</h2>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Title</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded border px-3 py-2"
        />
      </label>

      <div role="group" aria-label="Add book mode" className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('text')}
          aria-pressed={mode === 'text'}
          className={`rounded px-3 py-1 text-sm ${
            mode === 'text' ? 'bg-black text-white' : 'border'
          }`}
        >
          Paste text
        </button>
        <button
          type="button"
          onClick={() => setMode('file')}
          aria-pressed={mode === 'file'}
          className={`rounded px-3 py-1 text-sm ${
            mode === 'file' ? 'bg-black text-white' : 'border'
          }`}
        >
          Upload file
        </button>
      </div>

      {mode === 'text' ? (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Text</span>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={6}
            className="rounded border px-3 py-2"
          />
        </label>
      ) : (
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">File</span>
          <input
            type="file"
            accept=".txt,.epub"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="rounded border px-3 py-2"
          />
        </label>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
      >
        {submitting ? 'Adding…' : 'Add book'}
      </button>
    </form>
  );
}
