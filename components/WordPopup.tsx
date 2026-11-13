'use client';

import { useState } from 'react';
import SpeakButton from '@/components/SpeakButton';

export default function WordPopup({ word }: { word: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [definition, setDefinition] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [adding, setAdding] = useState(false);

  async function runLookup(add: boolean) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/words/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, add }),
      });
      if (!res.ok) {
        setError('Could not look up this word.');
        return;
      }
      const data = (await res.json()) as { definition: string | null };
      setDefinition(data.definition ?? 'No definition available.');
      if (add) {
        setAdded(true);
      }
    } catch {
      setError('Could not look up this word.');
    } finally {
      setLoading(false);
    }
  }

  async function handleWordClick() {
    setOpen(true);

    // Already looked up this word for this popup instance — don't re-fetch.
    if (definition !== null || loading) return;

    // I4: tapping the word is read-only — it shows the definition but must
    // not add the word to the SRS queue.
    await runLookup(false);
  }

  async function handleAddClick() {
    if (adding || added) return;
    setAdding(true);
    try {
      // I4: this is the only action that actually inserts the word into the
      // learner's vocabulary — a plain tap never does.
      await runLookup(true);
    } finally {
      setAdding(false);
    }
  }

  function handleClose() {
    // I5: popups previously had no way to close, so each tap left a
    // 240px-wide popover covering the following lines until the page
    // reloaded.
    setOpen(false);
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
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="self-end text-xs text-gray-500 hover:text-gray-800"
          >
            ✕
          </button>
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
                  onClick={handleAddClick}
                  disabled={adding}
                  className="self-start rounded bg-black px-2 py-1 text-xs text-white disabled:opacity-50"
                >
                  {adding ? 'Adding…' : 'Add to my vocabulary'}
                </button>
              )}
            </>
          )}
        </span>
      )}
    </span>
  );
}
