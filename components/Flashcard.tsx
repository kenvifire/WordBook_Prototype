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
    <div className="flex flex-col items-center gap-4 rounded border p-6">
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-semibold">{word.word}</h2>
        <SpeakButton word={word.word} />
      </div>

      {revealed ? (
        <>
          <p className="text-gray-700">{word.definition ?? 'No definition available.'}</p>
          <RatingButtons onRate={onRate} disabled={submitting} />
        </>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="rounded bg-black px-3 py-2 text-white"
        >
          Show definition
        </button>
      )}
    </div>
  );
}
