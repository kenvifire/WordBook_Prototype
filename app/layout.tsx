import type { Metadata } from 'next';
import { HeaderNav } from '@/components/HeaderNav';
import './globals.css';

export const metadata: Metadata = {
  title: 'WordBook',
  description: 'Learn vocabulary from the books you read.',
};

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
