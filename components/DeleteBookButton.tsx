'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteBookButton({ bookId }: { bookId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/books/${bookId}`, { method: 'DELETE' });
      if (!res.ok) {
        setError('Failed to delete book');
        setSubmitting(false);
        return;
      }
      router.push('/bookshelf');
    } catch {
      setError('Failed to delete book');
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      {confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-muted">Delete this book?</span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="rounded bg-error px-3 py-2 font-ui text-paper disabled:opacity-50"
          >
            {submitting ? 'Deleting…' : 'Yes, delete'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={submitting}
            className="rounded border border-hairline bg-surface px-3 py-2 font-ui text-ink-muted disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="self-start rounded border border-error px-3 py-2 font-ui text-error"
        >
          Delete book
        </button>
      )}
      {error && <p className="text-sm text-error">{error}</p>}
    </div>
  );
}
