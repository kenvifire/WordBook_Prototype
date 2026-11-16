'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ReactNode } from 'react';

type Mode = 'section' | 'free';

/**
 * Free/Section reading toggle shown on the Book Detail page once a book is
 * sectioned (or is AI-generated, which skips sectioning setup entirely —
 * see app/book/[id]/page.tsx). "Section reading" renders the existing
 * section-list markup passed in by the server page unchanged; "Free
 * reading" is a plain link to the separate /book/[id]/free route (built in
 * the next task of this plan) rather than content rendered inline here.
 */
export default function ReadingModeToggle({
  bookId,
  language,
  sectionList,
}: {
  bookId: string;
  language: string;
  sectionList: ReactNode;
}) {
  const [mode, setMode] = useState<Mode>('section');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div role="group" aria-label="Reading mode" className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('free')}
            aria-pressed={mode === 'free'}
            className={`rounded px-3 py-1 text-sm ${
              mode === 'free' ? 'bg-black text-white' : 'border'
            }`}
          >
            Free reading
          </button>
          <button
            type="button"
            onClick={() => setMode('section')}
            aria-pressed={mode === 'section'}
            className={`rounded px-3 py-1 text-sm ${
              mode === 'section' ? 'bg-black text-white' : 'border'
            }`}
          >
            Section reading
          </button>
        </div>
        <span className="text-xs uppercase text-gray-500">{language}</span>
      </div>

      {mode === 'section' ? (
        sectionList
      ) : (
        <Link href={`/book/${bookId}/free`} className="font-medium underline">
          Start Free reading
        </Link>
      )}
    </div>
  );
}
