export function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="card-block grain flex flex-col items-center gap-3 bg-card p-8 text-center">
      <svg viewBox="0 0 80 80" className="relative z-10 h-20 w-20" aria-hidden>
        <rect x="10" y="20" width="60" height="44" rx="8" fill="var(--lime)" stroke="var(--ink)" strokeWidth="3" />
        <line x1="40" y1="20" x2="40" y2="64" stroke="var(--ink)" strokeWidth="3" />
        <circle cx="62" cy="16" r="6" fill="var(--mint)" stroke="var(--ink)" strokeWidth="2" />
      </svg>
      <h2 className="relative z-10 text-2xl font-bold">{title}</h2>
      <p className="relative z-10 max-w-sm text-muted-foreground">{text}</p>
      {action && <div className="relative z-10">{action}</div>}
    </div>
  );
}
