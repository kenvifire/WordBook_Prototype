import { redirect } from 'next/navigation';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase/admin';
import { getAuthedUser } from '@/lib/firebase/server';
import SignOutButton from './SignOutButton';

export default async function SettingsPage() {
  const user = await getAuthedUser();

  if (!user) {
    redirect('/login');
  }

  const authUser = await getAuth(getAdminApp()).getUser(user.uid);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-semibold">Settings</h1>
      <p className="mb-6 text-sm">
        Signed in as <span className="font-medium">{authUser.email}</span>
      </p>
      <SignOutButton />
    </main>
  );
}
