'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignOutButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSignOut() {
    setSubmitting(true);
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
