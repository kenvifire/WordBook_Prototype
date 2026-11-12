import type { GateStatus } from '@/lib/types';

export interface GateStatusViewProps {
  status: GateStatus;
}

export function GateStatusView({ status }: GateStatusViewProps) {
  const percentage = Math.round(status.recognitionRate * 100);

  return (
    <div>
      <p>
        {status.recognizedCount} / {status.totalCount} words recognized ({percentage}%)
      </p>
      {status.passed ? (
        <p>Section unlocked</p>
      ) : (
        <p>Keep studying</p>
      )}
    </div>
  );
}
