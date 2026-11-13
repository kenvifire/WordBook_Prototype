'use client';

import type { Rating } from '@/lib/srs/sm2';

const RATINGS: { value: Rating; label: string }[] = [
  { value: 'again', label: 'Again' },
  { value: 'hard', label: 'Hard' },
  { value: 'good', label: 'Good' },
  { value: 'easy', label: 'Easy' },
];

export default function RatingButtons({ onRate }: { onRate: (rating: Rating) => void }) {
  return (
    <div role="group" aria-label="Rate your recall" className="flex gap-2">
      {RATINGS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onRate(value)}
          className="rounded border px-3 py-1 text-sm"
        >
          {label}
        </button>
      ))}
    </div>
  );
}
