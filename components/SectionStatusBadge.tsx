const STATUS_LABELS: Record<string, string> = {
  locked: 'Locked',
  ready_to_practice: 'Practice to unlock',
  ready_to_read: 'Ready to read',
  completed: 'Completed',
};

const STATUS_COLORS: Record<string, string> = {
  locked: 'bg-gray-200 text-gray-700',
  ready_to_practice: 'bg-yellow-100 text-yellow-800',
  ready_to_read: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
};

export default function SectionStatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] ?? status;
  const colorClass = STATUS_COLORS[status] ?? 'bg-gray-200 text-gray-700';

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {label}
    </span>
  );
}
