import { notFound, redirect } from 'next/navigation';
import { ReadingView } from '@/components/ReadingView';
import { getSection } from '@/lib/text/sections';
import { isSectionUnlocked } from '@/lib/store/learnerStore';

export default async function ReadPage({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;

  if (!isSectionUnlocked(sectionId)) {
    redirect(`/sections/${sectionId}/gate`);
  }

  const section = getSection(sectionId);
  if (!section) {
    notFound();
  }

  return (
    <main>
      <ReadingView sectionId={sectionId} text={section.text} />
    </main>
  );
}
