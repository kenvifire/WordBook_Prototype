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
          {visibleBooks.map((book) => (
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
                  {book.sectionsUnlocked} of {book.sectionsTotal} sections unlocked
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-600">No books in this language yet.</p>
      )}
    </div>
  );
}
