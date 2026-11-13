'use client';

import type { Rating } from '@/lib/srs/sm2';

const RATINGS: { value: Rating; label: string }[] = [
  { value: 'again', label: 'Again' },
  { value: 'hard', label: 'Hard' },
  { value: 'good', label: 'Good' },
  { value: 'easy', label: 'Easy' },
];

export default function RatingButtons({
  onRate,
  disabled = false,
}: {
  onRate: (rating: Rating) => void;
  disabled?: boolean;
}) {
  return (
    <div role="group" aria-label="Rate your recall" className="flex gap-2">
      {RATINGS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onRate(value)}
          disabled={disabled}
          className="rounded border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
