'use client';

import type { Rating } from '@/lib/srs/sm2';

const RATINGS: { value: Rating; label: string }[] = [
  { value: 'again', label: 'Again' },
  { value: 'hard', label: 'Hard' },
  { value: 'good', label: 'Good' },
  { value: 'easy', label: 'Easy' },
];

// "Again" is the only SM-2 outcome meaning "didn't recognize it"; the other
// three all mean "recognized it," varying only in confidence — so they share
// one color rather than inventing three shades the design system's token
// table doesn't license. A literal lookup object, not a template-string
// interpolation, so Tailwind's build-time scanner finds every class name.
const RATING_COLOR_CLASSES: Record<Rating, string> = {
  again: 'bg-practicing text-paper',
  hard: 'bg-unlocked text-paper',
  good: 'bg-unlocked text-paper',
  easy: 'bg-unlocked text-paper',
};

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
          className={`rounded px-3 py-1 font-ui text-sm disabled:cursor-not-allowed disabled:opacity-50 ${RATING_COLOR_CLASSES[value]}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
