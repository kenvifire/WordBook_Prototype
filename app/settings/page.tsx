import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function signOut() {
  'use server';

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    redirect('/login');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-semibold">Settings</h1>
      <p className="mb-6 text-sm">
        Signed in as <span className="font-medium">{user.email}</span>
      </p>
      <form action={signOut}>
        <button type="submit" className="rounded bg-black px-3 py-2 text-white">
          Sign out
        </button>
      </form>
    </main>
  );
}
