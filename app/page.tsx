import { SectionList } from '@/components/SectionList';
import { loadBook, DEMO_BOOK_ID } from '@/lib/text/sections';
import { isSectionUnlocked } from '@/lib/store/learnerStore';

export default function Home() {
  const book = loadBook(DEMO_BOOK_ID);
  const sections = book.sections.map((section) => ({
    id: section.id,
    title: section.title,
    unlocked: isSectionUnlocked(section.id),
  }));

  return (
    <main>
      <h1>{book.title}</h1>
      <SectionList sections={sections} />
    </main>
  );
}
