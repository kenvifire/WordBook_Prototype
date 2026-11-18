import type { Metadata } from 'next';
import { Figtree, Source_Serif_4 } from 'next/font/google';
import { HeaderNav } from '@/components/HeaderNav';
import { TabBar } from '@/components/TabBar';
import { getAuthedUser } from '@/lib/firebase/server';
import { getUserProfile } from '@/lib/users/userProfile';
import './globals.css';

export const metadata: Metadata = {
  title: 'WordBook',
  description: 'Learn vocabulary from the books you read.',
};

const figtree = Figtree({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-figtree',
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-source-serif',
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthedUser();
  const theme = user ? (await getUserProfile(user.uid)).theme : 'system';

  return (
    <html lang="en" data-theme={theme === 'system' ? undefined : theme}>
      <body className={`${figtree.variable} ${sourceSerif.variable}`}>
        <HeaderNav />
        {children}
        <TabBar />
      </body>
    </html>
  );
}
