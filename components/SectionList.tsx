import Link from 'next/link';

export interface SectionListProps {
  sections: { id: string; title: string; unlocked: boolean }[];
}

export function SectionList({ sections }: SectionListProps) {
  return (
    <ul>
      {sections.map((section) => (
        <li key={section.id}>
          {section.unlocked ? (
            <Link href={`/sections/${section.id}/read`}>{section.title}</Link>
          ) : (
            <Link href={`/sections/${section.id}/study`}>
              <span aria-hidden="true">🔒</span> {section.title}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
