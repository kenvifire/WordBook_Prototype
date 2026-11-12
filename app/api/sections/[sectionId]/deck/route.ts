import { buildDeck } from '@/lib/services/deckService';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const { sectionId } = await params;

  try {
    const deck = await buildDeck(sectionId);
    return Response.json(deck, { status: 200 });
  } catch {
    return Response.json({ error: 'not found' }, { status: 404 });
  }
}
