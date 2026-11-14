'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, signOut } from 'firebase/auth';
import { getFirebaseClientApp } from '@/lib/firebase/client';

export default function SignOutButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSignOut() {
    setSubmitting(true);
    // Clears the Firebase client SDK's own local auth state (IndexedDB),
    // in addition to the server-side session cookie clear + refresh-token
    // revocation below. Best-effort: a failure here must never block
    // actually signing the user out of the app.
    await signOut(getAuth(getFirebaseClientApp())).catch(() => {});
    await fetch('/api/auth/session', { method: 'DELETE' });
    router.push('/login');
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={submitting}
      className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
    >
      {submitting ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
