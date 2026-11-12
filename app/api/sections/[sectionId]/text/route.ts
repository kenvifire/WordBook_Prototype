import { getSection } from '@/lib/text/sections';
import { isSectionUnlocked } from '@/lib/store/learnerStore';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const { sectionId } = await params;

  if (!isSectionUnlocked(sectionId)) {
    return Response.json({ error: 'locked' }, { status: 403 });
  }

  const section = getSection(sectionId);
  if (!section) {
    return Response.json({ error: 'not found' }, { status: 404 });
  }

  return Response.json(
    { sectionId, title: section.title, text: section.text },
    { status: 200 }
  );
}
