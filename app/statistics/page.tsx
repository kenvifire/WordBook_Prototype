import { redirect } from 'next/navigation';
import { getAuthedUser } from '@/lib/firebase/server';
import { getStatisticsByLanguage } from '@/lib/stats/statsService';
import StatisticsView from '@/components/StatisticsView';

export default async function StatisticsPage() {
  const user = await getAuthedUser();

  if (!user) {
    redirect('/login');
  }

  const stats = await getStatisticsByLanguage(user.uid);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Statistics</h1>
      <StatisticsView stats={stats} />
    </main>
  );
}
