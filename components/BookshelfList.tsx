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
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Filter by language" className="flex flex-wrap gap-2">
        {languages.map((language) => (
          <button
            key={language}
            type="button"
            onClick={() => setSelected(language)}
            aria-pressed={selected === language}
            className={`rounded px-3 py-1 text-sm ${
              selected === language ? 'bg-black text-white' : 'border'
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
                  <div className="rounded border border-dashed px-3 py-2 text-gray-500">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{book.title}</span>
                      <span className="text-xs uppercase text-gray-500">{book.language}</span>
                    </div>
                    <p className="mt-1 text-sm">Generating…</p>
                  </div>
                </li>
              );
            }

            if (book.generationStatus === 'failed') {
              return (
                <li key={book.id}>
                  <div className="rounded border border-red-300 bg-red-50 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{book.title}</span>
                      <span className="text-xs uppercase text-gray-500">{book.language}</span>
                    </div>
                    <p className="mt-1 text-sm text-red-600">
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
                  className="block rounded border px-3 py-2 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{book.title}</span>
                    <span className="text-xs uppercase text-gray-500">{book.language}</span>
                  </div>
                  {book.author && (
                    <span className="text-sm text-gray-600">by {book.author}</span>
                  )}
                  <p className="mt-1 text-sm text-gray-600">
                    {book.needsSetup
                      ? 'Not yet started'
                      : `${book.sectionsUnlocked} of ${book.sectionsTotal} sections unlocked`}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-gray-600">No books in this language yet.</p>
      )}
    </div>
  );
}
