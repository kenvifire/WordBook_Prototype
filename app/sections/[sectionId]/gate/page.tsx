import Link from 'next/link';
import { GateStatusView } from '@/components/GateStatusView';
import { getAndMaybeUnlockGateStatus } from '@/lib/services/gateService';

export default async function GatePage({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;
  const status = getAndMaybeUnlockGateStatus(sectionId);

  return (
    <main>
      <GateStatusView status={status} />
      {status.passed ? (
        <Link href={`/sections/${sectionId}/read`}>Continue reading</Link>
      ) : (
        <Link href={`/sections/${sectionId}/study`}>Back to study</Link>
      )}
    </main>
  );
}
