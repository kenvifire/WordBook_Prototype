import { getCardsForSection } from '@/lib/store/cardStore';
import { computeGateStatus } from '@/lib/srs/gate';
import { isSectionUnlocked, unlockSection } from '@/lib/store/learnerStore';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const { sectionId } = await params;

  const status = computeGateStatus(getCardsForSection(sectionId));
  if (status.passed) {
    unlockSection(sectionId);
  }

  return Response.json({ ...status, unlocked: isSectionUnlocked(sectionId) }, { status: 200 });
}
