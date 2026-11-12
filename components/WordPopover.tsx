'use client';

import { useEffect, useState } from 'react';

export interface WordPopoverProps {
  sectionId: string;
  token: string;
  sentence: string;
  onClose: () => void;
}

export function WordPopover({ sectionId, token, sentence, onClose }: WordPopoverProps) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [addedToQueue, setAddedToQueue] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchTranslation() {
      const response = await fetch('/api/words/tap', {
        method: 'POST',
        body: JSON.stringify({ sectionId, token, sentence }),
      });
      const data = await response.json();
      if (!cancelled) {
        setTranslation(data.translation);
        // The tap route also creates a review card for this word; confirm it.
        setAddedToQueue(response.ok && Boolean(data.card));
      }
    }

    fetchTranslation();

    return () => {
      cancelled = true;
    };
  }, [sectionId, token, sentence]);

  return (
    <div>
      {translation === null ? <p>Loading...</p> : <p>{translation}</p>}
      {addedToQueue && <p>Added to your review queue</p>}
      <button type="button" onClick={onClose}>
        Close
      </button>
    </div>
  );
}
