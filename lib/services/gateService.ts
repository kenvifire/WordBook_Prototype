import { computeGateStatus } from '@/lib/srs/gate';
import { getCardsForSection } from '@/lib/store/cardStore';
import { unlockSection } from '@/lib/store/learnerStore';
import type { GateStatus } from '@/lib/types';

/**
 * Computes a section's gate status from its cards and, if the gate passes,
 * persists the unlock so `/read` will render. Shared by the gate page and the
 * gate API route so the compute-and-unlock logic lives in exactly one place.
 */
export function getAndMaybeUnlockGateStatus(sectionId: string): GateStatus {
  const status = computeGateStatus(getCardsForSection(sectionId));
  if (status.passed) {
    unlockSection(sectionId);
  }
  return status;
}
