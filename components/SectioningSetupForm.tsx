'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type SectioningMethod = 'by_page' | 'by_chapter';

/**
 * First-open setup screen for an uploaded book that hasn't been sectioned
 * yet (`source: 'uploaded' && sectioningMethod === null` — see
 * app/book/[id]/page.tsx). Posts the chosen method to
 * POST /api/books/[id]/sectioning, then router.refresh()es so the Server
 * Component page re-reads the now-finalized book doc and renders the
 * normal Free/Section toggle instead. The "by chapter" button only renders
 * when the caller says chapter breaks were detected (Review Focus: a book
 * with no detectable chapters must not offer a dead-end "by chapter"
 * option).
 */
export default function SectioningSetupForm({
  bookId,
  hasChapterBreaks,
}: {
  bookId: string;
  hasChapterBreaks: boolean;
}) {
  const router = useRouter();
  const [pagesPerSection, setPagesPerSection] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(body: { method: SectioningMethod; pagesPerSection?: number }) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/books/${bookId}/sectioning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      let data: { error?: string } = {};
      try {
        data = await res.json();
      } catch {
        // Response body may be empty; fall through to the generic error below.
      }

      if (!res.ok) {
        setError(data.error ?? 'Failed to set up this book');
        return;
      }

      router.refresh();
    } catch {
      setError('Failed to set up this book');
    } finally {
      setSubmitting(false);
    }
  }

  function handlePageCountSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void submit({ method: 'by_page', pagesPerSection });
  }

  return (
    <div className="flex flex-col gap-4 rounded border border-hairline bg-surface p-4 font-ui">
      <h2 className="text-lg font-semibold text-ink">Set up this book</h2>
      <p className="text-sm text-ink-muted">
        Choose how to split this book into sections before practicing its vocabulary — or skip
        straight to Free reading below.
      </p>

      <form onSubmit={handlePageCountSubmit} className="flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink">Pages per section</span>
          <input
            type="number"
            min={1}
            value={pagesPerSection}
            onChange={(e) => setPagesPerSection(Number(e.target.value))}
            className="w-24 rounded border border-hairline bg-surface px-3 py-2 text-ink"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-ink px-3 py-2 text-paper disabled:opacity-50"
        >
          Section by page count
        </button>
      </form>

      {hasChapterBreaks && (
        <button
          type="button"
          disabled={submitting}
          onClick={() => void submit({ method: 'by_chapter' })}
          className="rounded border border-hairline bg-surface px-3 py-2 text-ink-muted disabled:opacity-50"
        >
          Section by chapter
        </button>
      )}

      {error && <p className="text-sm text-error">{error}</p>}

      <Link href={`/book/${bookId}/free`} className="text-sm text-ink underline">
        Start Free reading without choosing a method
      </Link>
    </div>
  );
}
