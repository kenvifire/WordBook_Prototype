'use client';

import { useState } from 'react';
import SpeakButton from '@/components/SpeakButton';

export default function WordPopup({ word }: { word: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [definition, setDefinition] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  async function handleWordClick() {
    setOpen(true);

    // Already looked up this word for this popup instance — don't re-fetch.
    if (definition !== null || loading) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/words/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word }),
      });
      if (!res.ok) {
        setError('Could not look up this word.');
        return;
      }
      const data = (await res.json()) as { definition: string | null };
      setDefinition(data.definition ?? 'No definition available.');
    } catch {
      setError('Could not look up this word.');
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleWordClick();
    }
  }

  return (
    <span className="relative inline-block">
      <span
        role="button"
        tabIndex={0}
        onClick={handleWordClick}
        onKeyDown={handleKeyDown}
        className="cursor-pointer rounded px-0.5 hover:bg-yellow-100"
      >
        {word}
      </span>

      {open && (
        <span className="absolute left-0 top-full z-10 mt-1 flex w-60 flex-col gap-2 rounded border bg-white p-3 text-sm shadow-lg">
          {loading && <span>Loading…</span>}
          {error && <span className="text-red-600">{error}</span>}
          {!loading && !error && definition && (
            <>
              <span className="flex items-center gap-2 font-semibold">
                {word}
                <SpeakButton word={word} />
              </span>
              <span>{definition}</span>
              {added ? (
                <span className="text-green-600">Added ✓</span>
              ) : (
                <button
                  type="button"
                  // The lookup POST above already created/reused this word's
                  // row for the user, so there's nothing left to send — this
                  // just confirms it to the learner.
                  onClick={() => setAdded(true)}
                  className="self-start rounded bg-black px-2 py-1 text-xs text-white"
                >
                  Add to my vocabulary
                </button>
              )}
            </>
          )}
        </span>
      )}
    </span>
  );
}
