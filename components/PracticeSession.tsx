'use client';

import { useState } from 'react';
import Link from 'next/link';
import Flashcard, { type FlashcardWord } from '@/components/Flashcard';
import type { Rating } from '@/lib/srs/sm2';

export default function PracticeSession({
  words,
  doneMessage,
  doneHref,
  doneLinkLabel,
}: {
  words: FlashcardWord[];
  doneMessage: string;
  doneHref: string;
  doneLinkLabel: string;
}) {
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (index >= words.length) {
    return (
      <div className="flex flex-col gap-4">
        <p>{doneMessage}</p>
        <Link href={doneHref} className="font-medium underline">
          {doneLinkLabel}
        </Link>
      </div>
    );
  }

  const currentWord = words[index];

  async function handleRate(rating: Rating) {
    // I7: without this guard, a rapid double-click fired two POSTs for the
    // same word before the first response came back, double-applying the
    // SM-2 transition server-side and skipping the next card (since each
    // response advances the index). Ignoring a click while one is already
    // in flight is a second line of defense on top of disabling the
    // buttons below.
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/words/${currentWord.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      });
      if (!res.ok) {
        setError('Failed to save rating. Try again.');
        return;
      }
    } catch {
      setError('Failed to save rating. Try again.');
      return;
    } finally {
      setSubmitting(false);
    }
    setIndex((i) => i + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">
        {index + 1} / {words.length}
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Flashcard key={currentWord.id} word={currentWord} onRate={handleRate} submitting={submitting} />
    </div>
  );
}
