import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'WordBook',
  description: 'Learn vocabulary from the books you read.',
};

// I3: a small, always-rendered nav so /review and /settings (and the library)
// are reachable from anywhere instead of only by typing the URL. It's fine
// for this to render on every page, including for a logged-out visitor —
// each destination page already redirects to /login itself when there's no
// session, so no auth-aware rendering is needed here.
export function HeaderNav() {
  return (
    <nav className="flex gap-4 border-b px-4 py-3 text-sm font-medium">
      <Link href="/library" className="hover:underline">
        Library
      </Link>
      <Link href="/review" className="hover:underline">
        Review
      </Link>
      <Link href="/settings" className="hover:underline">
        Settings
      </Link>
    </nav>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <HeaderNav />
        {children}
      </body>
    </html>
  );
}
