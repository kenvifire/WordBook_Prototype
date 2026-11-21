'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced'];

// Mirrors MIN/MAX_TARGET_WORD_COUNT in app/api/books/generate/route.ts —
// kept as a separate literal here (not imported) since that file is
// server-only and this is a client component; enforcing the same bound
// client-side is just for fast feedback, the route is still the real gate.
const MIN_TARGET_WORD_COUNT = 5;
const MAX_TARGET_WORD_COUNT = 50;
const DEFAULT_TARGET_WORD_COUNT = 20;

// Mirrors MIN/MAX_NEW_WORD_PERCENTAGE in app/api/books/generate/route.ts —
// same reasoning as the word-count bounds above: fast client-side feedback,
// the route is still the real gate.
const MIN_NEW_WORD_PERCENTAGE = 0;
const MAX_NEW_WORD_PERCENTAGE = 100;
const DEFAULT_NEW_WORD_PERCENTAGE = 50;

export default function GenerateBookForm() {
  const router = useRouter();
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
  // Kept as a string while editing (not a number) so an in-progress edit
  // like clearing the field and typing "100" digit-by-digit doesn't get
  // mangled by Number('') coercing to 0 and reappearing as a leading
  // digit — parsed to a number only at submit/validation time.
  const [targetWordCountInput, setTargetWordCountInput] = useState(
    String(DEFAULT_TARGET_WORD_COUNT)
  );
  const [newWordPercentageInput, setNewWordPercentageInput] = useState(
    String(DEFAULT_NEW_WORD_PERCENTAGE)
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (topic.trim().length === 0) {
      setError('Topic is required');
      return;
    }

    if (language.trim().length === 0) {
      setError('Target language is required');
      return;
    }

    const targetWordCount = Number(targetWordCountInput);
    if (
      targetWordCountInput.trim().length === 0 ||
      !Number.isInteger(targetWordCount) ||
      targetWordCount < MIN_TARGET_WORD_COUNT ||
      targetWordCount > MAX_TARGET_WORD_COUNT
    ) {
      setError(
        `Number of words must be between ${MIN_TARGET_WORD_COUNT} and ${MAX_TARGET_WORD_COUNT}`
      );
      return;
    }

    const newWordPercentage = Number(newWordPercentageInput);
    if (
      newWordPercentageInput.trim().length === 0 ||
      !Number.isInteger(newWordPercentage) ||
      newWordPercentage < MIN_NEW_WORD_PERCENTAGE ||
      newWordPercentage > MAX_NEW_WORD_PERCENTAGE
    ) {
      setError(
        `New word percentage must be between ${MIN_NEW_WORD_PERCENTAGE} and ${MAX_NEW_WORD_PERCENTAGE}`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/books/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, difficulty, language, targetWordCount, newWordPercentage }),
      });

      let data: { error?: string } = {};
      try {
        data = await res.json();
      } catch {
        // Response body may be empty; fall through to the generic error below.
      }

      if (!res.ok) {
        setError(data.error ?? 'Failed to generate book');
        return;
      }

      setTopic('');
      setLanguage('');
      setDifficulty('beginner');
      setTargetWordCountInput(String(DEFAULT_TARGET_WORD_COUNT));
      setNewWordPercentageInput(String(DEFAULT_NEW_WORD_PERCENTAGE));
      // The new book doc already exists with generationStatus: 'pending' by
      // the time this route responds (see startGeneratingBook) — refresh
      // picks it up and the Bookshelf's own pending-card/poller handling
      // takes it from there.
      router.refresh();
    } catch {
      setError('Failed to generate book');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mb-8 flex flex-col gap-4 rounded border border-hairline bg-surface p-4 font-ui"
    >
      <h2 className="text-lg font-semibold text-ink">Generate a book</h2>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink">Topic</span>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="rounded border border-hairline bg-surface px-3 py-2 text-ink"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink">Target language</span>
        <input
          type="text"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="rounded border border-hairline bg-surface px-3 py-2 text-ink"
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink">Difficulty level</span>
        <div role="group" aria-label="Difficulty level" className="flex gap-2">
          {DIFFICULTIES.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setDifficulty(level)}
              aria-pressed={difficulty === level}
              className={`rounded px-3 py-1 text-sm capitalize ${
                difficulty === level
                  ? 'bg-ink text-paper'
                  : 'border border-hairline bg-surface text-ink-muted'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink">Number of words to learn</span>
        <input
          type="number"
          min={MIN_TARGET_WORD_COUNT}
          max={MAX_TARGET_WORD_COUNT}
          value={targetWordCountInput}
          onChange={(e) => setTargetWordCountInput(e.target.value)}
          className="rounded border border-hairline bg-surface px-3 py-2 text-ink"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-ink">New word percentage</span>
        <input
          type="number"
          min={MIN_NEW_WORD_PERCENTAGE}
          max={MAX_NEW_WORD_PERCENTAGE}
          value={newWordPercentageInput}
          onChange={(e) => setNewWordPercentageInput(e.target.value)}
          className="rounded border border-hairline bg-surface px-3 py-2 text-ink"
        />
      </label>

      {error && <p className="text-sm text-error">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-ink px-3 py-2 text-paper disabled:opacity-50"
      >
        {submitting ? 'Generating…' : 'Generate book'}
      </button>
    </form>
  );
}
