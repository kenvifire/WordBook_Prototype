'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/bookshelf', label: 'Bookshelf' },
  { href: '/practice', label: 'Practice' },
  { href: '/statistics', label: 'Statistics' },
] as const;

// Bottom tab bar replacing the old header text links (v3 tab restructure).
// A client component because the active tab is derived from the current
// pathname via usePathname().
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 flex border-t border-hairline bg-surface font-ui text-sm font-medium">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href || pathname?.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={`flex-1 py-3 text-center hover:underline ${
              isActive ? 'text-ink' : 'text-ink-muted'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
