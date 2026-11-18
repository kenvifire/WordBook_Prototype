import Link from 'next/link';

// v3: the header is now just a slim bar with a settings gear — Bookshelf,
// Practice, and Statistics moved to the bottom TabBar (components/TabBar.tsx).
// It's fine for this to render on every page, including for a logged-out
// visitor — each destination page already redirects to /login itself when
// there's no session, so no auth-aware rendering is needed here.
export function HeaderNav() {
  return (
    <nav className="flex justify-end border-b border-hairline bg-surface px-4 py-3 font-ui text-sm font-medium">
      <Link
        href="/settings"
        aria-label="Settings"
        className="text-lg text-ink-muted hover:underline"
      >
        ⚙
      </Link>
    </nav>
  );
}
