import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';

/**
 * Lazily-initialized Firebase Admin SDK app singleton.
 *
 * Reads service-account credentials from `FIREBASE_PROJECT_ID`,
 * `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` env vars. Safe to call
 * repeatedly (e.g. across Next.js hot-reloads or multiple imports) — returns
 * the already-initialized app instead of re-initializing.
 */
export function getAdminApp(): App {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0];
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}
