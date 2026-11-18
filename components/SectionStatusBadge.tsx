const STATUS_LABELS: Record<string, string> = {
  locked: 'Locked',
  ready_to_practice: 'Practice to unlock',
  ready_to_read: 'Ready to read',
  completed: 'Completed',
};

// ready_to_read and completed intentionally share the unlocked color (both
// mean "the gate is cleared") — completed gets a checkmark glyph so the two
// stay visually distinguishable without a fourth hue the design system's
// token table doesn't license. A literal lookup object, not a
// template-string interpolation, so Tailwind's build-time scanner finds
// every class name.
const STATUS_STYLES: Record<string, { className: string; checkmark: boolean }> = {
  // locked/practicing are light fills — text-paper fails WCAG contrast at
  // this size (~2.5:1/~2.7:1); text-ink passes (~5.2:1/~5.0:1).
  locked: { className: 'bg-locked text-ink', checkmark: false },
  ready_to_practice: { className: 'bg-practicing text-ink', checkmark: false },
  ready_to_read: { className: 'bg-unlocked text-paper', checkmark: false },
  completed: { className: 'bg-unlocked text-paper', checkmark: true },
};

const DEFAULT_STYLE = { className: 'bg-locked text-ink', checkmark: false };

export default function SectionStatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  const { className, checkmark } = STATUS_STYLES[status] ?? DEFAULT_STYLE;

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 font-ui text-xs font-medium ${className}`}
    >
      {checkmark ? '✓ ' : ''}
      {label}
    </span>
  );
}
