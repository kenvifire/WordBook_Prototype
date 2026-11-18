'use client';

import { useState } from 'react';
import type { Rating } from '@/lib/srs/sm2';
import SpeakButton from '@/components/SpeakButton';
import RatingButtons from '@/components/RatingButtons';

export type FlashcardWord = {
  id: string;
  word: string;
  definition: string | null;
};

export default function Flashcard({
  word,
  onRate,
  submitting = false,
}: {
  word: FlashcardWord;
  onRate: (rating: Rating) => void;
  submitting?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex flex-col items-center gap-4 rounded border border-hairline bg-surface p-6">
      <div className="flex items-center gap-2">
        <h2 className="font-reading text-2xl font-semibold text-ink">{word.word}</h2>
        <SpeakButton word={word.word} />
      </div>

      {revealed ? (
        <>
          <p className="font-reading text-ink-muted">
            {word.definition ?? 'No definition available.'}
          </p>
          <RatingButtons onRate={onRate} disabled={submitting} />
        </>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="rounded bg-ink px-3 py-2 font-ui text-paper"
        >
          Show definition
        </button>
      )}
    </div>
  );
}
