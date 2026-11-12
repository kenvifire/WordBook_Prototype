'use client';

import { useState } from 'react';
import type { Grade, PrioritizedWord, WordSense } from '@/lib/types';

export interface FlashcardViewProps {
  // `reason` is the AI's explanation of why this word was picked; it is shown
  // on the card so the prototype's reasoning is visible on screen.
  word: WordSense & Pick<PrioritizedWord, 'reason'>;
  onGrade: (grade: Grade) => void;
}

const GRADES: { grade: Grade; label: string }[] = [
  { grade: 'again', label: 'Again' },
  { grade: 'hard', label: 'Hard' },
  { grade: 'good', label: 'Good' },
  { grade: 'easy', label: 'Easy' },
];

export function FlashcardView({ word, onGrade }: FlashcardViewProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div>
      <p>
        {word.sentence.split(word.token).map((part, i, arr) => (
          <span key={i}>
            {part}
            {i < arr.length - 1 && <strong>{word.token}</strong>}
          </span>
        ))}
      </p>
      <p>Why this word: {word.reason}</p>
      {!revealed && (
        <button type="button" onClick={() => setRevealed(true)}>
          Show answer
        </button>
      )}
      {revealed && (
        <div>
          <p>{word.definitionEn}</p>
          <p>Translation: {word.translationEn}</p>
          <p>Example: {word.exampleEs}</p>
          <div>
            {GRADES.map(({ grade, label }) => (
              <button key={grade} type="button" onClick={() => onGrade(grade)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
