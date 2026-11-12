import { getAndMaybeUnlockGateStatus } from '@/lib/services/gateService';
import { isSectionUnlocked } from '@/lib/store/learnerStore';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const { sectionId } = await params;

  const status = getAndMaybeUnlockGateStatus(sectionId);

  return Response.json({ ...status, unlocked: isSectionUnlocked(sectionId) }, { status: 200 });
}
