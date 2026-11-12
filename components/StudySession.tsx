'use client';

import { useEffect, useState } from 'react';
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
  const isEmpty = deck.words.length === 0;

  // An empty deck auto-passes the gate (computeGateStatus([]) is passed: true).
  // Send the learner to the gate page, which runs getAndMaybeUnlockGateStatus
  // to persist the unlock and then links onward to /read — no dead end.
  useEffect(() => {
    if (isEmpty) {
      router.replace(`/sections/${sectionId}/gate`);
    }
  }, [isEmpty, router, sectionId]);

  if (isEmpty) {
    return <p>No new words to study in this section. Continuing...</p>;
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

  return <FlashcardView key={word.card.id} word={word} onGrade={handleGrade} />;
}
