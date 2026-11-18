'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

export type BookshelfBook = {
  id: string;
  title: string;
  author: string | null;
  language: string;
  sectionsTotal: number;
  sectionsUnlocked: number;
  // Minor #5: true for an uploaded book that hasn't finished its
  // deferred-sectioning setup yet (source: 'uploaded' and
  // sectioningMethod still null) — such a book has zero sections, which
  // would otherwise render as the misleading "0 of 0 sections unlocked".
  needsSetup: boolean;
  // Only ever set on an ai_generated book: 'pending' while DeepSeek
  // generation + sectioning is still running in the background, 'failed'
  // if it errored out, 'ready' once its sections/words exist. An uploaded
  // book has no generationStatus field at all (undefined), and a ready
  // generated book renders identically to an uploaded one. needsSetup and
  // generationStatus are mutually exclusive by construction — needsSetup
  // only ever applies to source: 'uploaded', generationStatus only ever
  // applies to source: 'ai_generated'.
  generationStatus?: 'pending' | 'ready' | 'failed';
};

const ALL = 'All';

export default function BookshelfList({ books }: { books: BookshelfBook[] }) {
  const languages = useMemo(() => {
    const distinct = Array.from(new Set(books.map((b) => b.language))).sort();
    return [ALL, ...distinct];
  }, [books]);

  const [selected, setSelected] = useState<string>(ALL);

  const visibleBooks = selected === ALL ? books : books.filter((b) => b.language === selected);

  return (
    <div className="flex flex-col gap-4 font-ui">
      <div role="group" aria-label="Filter by language" className="flex flex-wrap gap-2">
        {languages.map((language) => (
          <button
            key={language}
            type="button"
            onClick={() => setSelected(language)}
            aria-pressed={selected === language}
            className={`rounded px-3 py-1 text-sm ${
              selected === language
                ? 'bg-ink text-paper'
                : 'border border-hairline bg-surface text-ink-muted'
            }`}
          >
            {language}
          </button>
        ))}
      </div>

      {visibleBooks.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {visibleBooks.map((book) => {
            // A generated book still 'pending' or 'failed' has no sections
            // to open and, per the known gap documented in
            // app/book/[id]/page.tsx's generationStatus blind spot, must
            // never link into the Book Detail page while in either state —
            // these are plain, non-clickable cards, not a Link that would
            // otherwise still route through.
            if (book.generationStatus === 'pending') {
              return (
                <li key={book.id}>
                  <div className="rounded border border-dashed border-hairline bg-surface px-3 py-2 text-ink-muted">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{book.title}</span>
                      <span className="text-xs uppercase text-ink-muted">{book.language}</span>
                    </div>
                    <p
                      data-testid="generating-sweep"
                      className="mt-1 h-2 w-24 rounded bg-gradient-to-r from-surface via-hairline to-surface bg-[length:200%_100%] motion-safe:animate-sweep"
                      aria-label="Generating…"
                    >
                      <span className="sr-only">Generating…</span>
                    </p>
                  </div>
                </li>
              );
            }

            if (book.generationStatus === 'failed') {
              return (
                <li key={book.id}>
                  <div className="rounded border border-error bg-surface px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-ink">{book.title}</span>
                      <span className="text-xs uppercase text-ink-muted">{book.language}</span>
                    </div>
                    <p className="mt-1 text-sm text-error">
                      Generation failed. Please try again.
                    </p>
                  </div>
                </li>
              );
            }

            return (
              <li key={book.id}>
                <Link
                  href={`/book/${book.id}`}
                  className="block rounded border border-hairline bg-surface px-3 py-2 hover:bg-paper"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink">{book.title}</span>
                    <span className="text-xs uppercase text-ink-muted">{book.language}</span>
                  </div>
                  {book.author && (
                    <span className="text-sm text-ink-muted">by {book.author}</span>
                  )}
                  {book.needsSetup ? (
                    <p className="mt-1 text-sm text-ink-muted">Not yet started</p>
                  ) : (
                    <div
                      className="mt-1 flex flex-wrap gap-0.5"
                      role="img"
                      aria-label={`${book.sectionsUnlocked} of ${book.sectionsTotal} sections unlocked`}
                    >
                      {Array.from({ length: book.sectionsTotal }).map((_, i) => (
                        <span
                          key={i}
                          data-testid="spine-segment"
                          className={`h-4 w-1 rounded-sm ${
                            i < book.sectionsUnlocked ? 'bg-unlocked' : 'bg-locked'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted">No books in this language yet.</p>
      )}
    </div>
  );
}
