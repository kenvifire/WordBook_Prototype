import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase/admin';

// 14 days, matching the `expiresIn` Firebase expects (ms) for createSessionCookie.
const SESSION_EXPIRES_IN_MS = 1000 * 60 * 60 * 24 * 14;

/**
 * Exchanges a freshly-minted Firebase client ID token for an httpOnly
 * session cookie. The client (login/signup pages) signs in with the
 * Firebase client SDK, then POSTs the resulting ID token here so the
 * server can verify it once and set a cookie every subsequent request
 * relies on (via `getAuthedUser()`).
 */
export async function POST(request: NextRequest) {
  // A malformed body (no body, non-JSON) would otherwise throw out of
  // request.json() and surface as an uncaught 500 — mirrors the guard
  // pattern in app/api/words/[wordId]/rate/route.ts.
  const body = (await request.json().catch(() => null)) as { idToken?: unknown } | null;
  const idToken = body?.idToken;

  if (!idToken || typeof idToken !== 'string') {
    return NextResponse.json({ error: 'Invalid idToken' }, { status: 400 });
  }

  try {
    const sessionCookie = await getAuth(getAdminApp()).createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_IN_MS,
    });

    (await cookies()).set('session', sessionCookie, {
      httpOnly: true,
      secure: true,
      maxAge: SESSION_EXPIRES_IN_MS / 1000,
      path: '/',
    });

    return new NextResponse(null, { status: 204 });
  } catch {
    // Firebase rejects createSessionCookie for an invalid/expired idToken.
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

/** Clears the session cookie on sign-out. */
export async function DELETE() {
  (await cookies()).delete('session');
  return new NextResponse(null, { status: 204 });
}
