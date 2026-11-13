import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase/admin';

/**
 * Reads and verifies the `session` httpOnly cookie against the Firebase
 * Admin SDK. Returns `{ uid }` on success, or `null` on any failure
 * (missing cookie, expired/invalid session) — never throws. Every protected
 * page/route calls this exactly once to establish identity.
 */
export async function getAuthedUser(): Promise<{ uid: string } | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    if (!sessionCookie) {
      return null;
    }

    const decoded = await getAuth(getAdminApp()).verifySessionCookie(sessionCookie, true);
    return { uid: decoded.uid };
  } catch {
    return null;
  }
}
