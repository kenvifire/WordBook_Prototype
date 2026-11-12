import { StudySession } from '@/components/StudySession';
import { buildDeck } from '@/lib/services/deckService';

export default async function StudyPage({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;
  const deck = await buildDeck(sectionId);

  return (
    <main>
      <StudySession sectionId={sectionId} deck={deck} />
    </main>
  );
}
