'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FlashcardView } from '@/components/FlashcardView';
import type { Grade } from '@/lib/types';
import type { DeckWord } from '@/lib/services/deckService';

export interface StudySessionProps {
  sectionId: string;
  deck: { sectionId: string; words: DeckWord[] };
}

export function StudySession({ sectionId, deck }: StudySessionProps) {
  const router = useRouter();
  const [index, setIndex] = useState(0);

  if (deck.words.length === 0) {
    return <p>No words to study in this section.</p>;
  }

  const word = deck.words[index];

  async function handleGrade(grade: Grade) {
    await fetch(`/api/cards/${word.card.id}/review`, {
      method: 'POST',
      body: JSON.stringify({ grade }),
    });

    if (index + 1 < deck.words.length) {
      setIndex(index + 1);
    } else {
      router.push(`/sections/${sectionId}/gate`);
    }
  }

  return <FlashcardView word={word} onGrade={handleGrade} />;
}
