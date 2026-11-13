import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';

/** Browser-facing Firebase config, read from `NEXT_PUBLIC_FIREBASE_*` env vars. */
export function getFirebaseClientConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  };
}

/**
 * Lazily-initialized Firebase client SDK app singleton. Used only by the
 * login/signup pages to obtain an ID token — never for Firestore reads/writes.
 */
export function getFirebaseClientApp(): FirebaseApp {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0];
  }

  return initializeApp(getFirebaseClientConfig());
}
