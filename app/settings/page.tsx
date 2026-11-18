import { redirect } from 'next/navigation';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase/admin';
import { getAuthedUser } from '@/lib/firebase/server';
import { getUserProfile } from '@/lib/users/userProfile';
import SettingsForm from '@/components/SettingsForm';
import SignOutButton from './SignOutButton';

export default async function SettingsPage() {
  const user = await getAuthedUser();

  if (!user) {
    redirect('/login');
  }

  const [authUser, profile] = await Promise.all([
    getAuth(getAdminApp()).getUser(user.uid),
    getUserProfile(user.uid),
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center bg-paper px-4 py-8 font-ui">
      <h1 className="mb-6 text-2xl font-semibold text-ink">Settings</h1>
      <p className="mb-6 text-sm text-ink-muted">
        Signed in as <span className="font-medium text-ink">{authUser.email}</span>
      </p>
      <SettingsForm initialProfile={profile} />
      <div className="mt-8">
        <SignOutButton />
      </div>
    </main>
  );
}
