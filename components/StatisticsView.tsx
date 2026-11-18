'use client';

import { useState } from 'react';
import type { LanguageStats } from '@/lib/stats/statsService';

// One language's stats at a time, per the design doc (docs/superpowers/specs/
// 2026-11-15-wordbook-v3-design.md's Statistics tab section), switched via a
// row of chips — same "page fetches once as a Server Component, a small
// 'use client' child holds the selected-chip state" pattern as
// components/BookshelfList.tsx (Task 2).
export default function StatisticsView({ stats }: { stats: LanguageStats[] }) {
  const [selected, setSelected] = useState<string>(stats[0]?.language ?? '');

  const current = stats.find((s) => s.language === selected) ?? stats[0];

  if (!current) {
    return (
      <p className="font-ui text-sm text-ink-muted">
        No statistics yet. Add a book to get started.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 font-ui">
      <div role="group" aria-label="Switch language" className="flex flex-wrap gap-2">
        {stats.map((s) => (
          <button
            key={s.language}
            type="button"
            onClick={() => setSelected(s.language)}
            aria-pressed={current.language === s.language}
            className={`rounded px-3 py-1 text-sm ${
              current.language === s.language
                ? 'bg-ink text-paper'
                : 'border border-hairline bg-surface text-ink-muted'
            }`}
          >
            {s.language}
          </button>
        ))}
      </div>

      <div>
        <p className="text-sm text-ink-muted">Words mastered</p>
        <p className="text-3xl font-semibold text-ink">{current.wordsMastered}</p>
      </div>

      <div>
        <p className="mb-2 text-sm text-ink-muted">Books</p>
        {current.books.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {current.books.map((book) => (
              <li key={book.id} className="rounded border border-hairline bg-surface px-3 py-2">
                <p className="font-medium text-ink">{book.title}</p>
                <p className="text-sm text-ink-muted">
                  Sections completed: {book.completedSections} of {book.totalSections}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">No books in this language yet.</p>
        )}
      </div>
    </div>
  );
}
