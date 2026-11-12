import { getCard, upsertCard, getCardsForSection } from '@/lib/store/cardStore';
import { appendReview } from '@/lib/store/reviewStore';
import { nextSM2State } from '@/lib/srs/sm2';
import { computeGateStatus } from '@/lib/srs/gate';
import { markWordsKnown } from '@/lib/store/learnerStore';
import type { Grade } from '@/lib/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ cardId: string }> }
) {
  const { cardId } = await params;
  const { grade } = (await request.json()) as { grade: Grade };

  const lastColonIndex = cardId.lastIndexOf(':');
  const sectionId = cardId.slice(0, lastColonIndex);
  const token = cardId.slice(lastColonIndex + 1);

  const card = getCard(sectionId, token);
  if (!card) {
    return Response.json({ error: 'not found' }, { status: 404 });
  }

  const next = nextSM2State(card, grade);
  const updated = {
    ...card,
    ...next,
    lastGrade: grade,
    dueAt: new Date(Date.now() + next.interval * 86400000).toISOString(),
  };
  upsertCard(updated);
  appendReview({ cardId, grade, gradedAt: new Date().toISOString() });

  if (grade !== 'again') {
    markWordsKnown([token]);
  }

  return Response.json(
    { card: updated, gate: computeGateStatus(getCardsForSection(sectionId)) },
    { status: 200 }
  );
}
