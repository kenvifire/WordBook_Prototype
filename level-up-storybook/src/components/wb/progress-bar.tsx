import { cn } from "@/lib/utils";
export function ProgressBar({ value, label, className }: { value: number; label: string; className?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={className}>
      <div className="mb-1 flex justify-between text-sm font-semibold"><span>{label}</span><span>{v}%</span></div>
      <div role="progressbar" aria-label={label} aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} className="h-4 overflow-hidden rounded-full border-2 border-ink bg-muted">
        <div className={cn("h-full bg-aqua transition-all")} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}
