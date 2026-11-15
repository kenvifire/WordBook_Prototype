import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebase/admin';

export type Theme = 'light' | 'dark' | 'system';

export type UserProfile = {
  nativeLanguage: string | null;
  avatarUrl: string | null;
  theme: Theme;
  recognitionThreshold: number; // fraction 0..1
};

export const DEFAULT_RECOGNITION_THRESHOLD = 0.8;
export const DEFAULT_THEME: Theme = 'system';

/**
 * Reads `users/{userId}`, returning safe per-field defaults for a missing
 * doc or any missing field within it — never throws just because an
 * account has no profile doc yet (every account today has none).
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  const db = getFirestore(getAdminApp());
  const snap = await db.collection('users').doc(userId).get();
  const data = (snap.exists ? snap.data() : undefined) as Partial<UserProfile> | undefined;

  return {
    nativeLanguage: data?.nativeLanguage ?? null,
    avatarUrl: data?.avatarUrl ?? null,
    theme: data?.theme ?? DEFAULT_THEME,
    recognitionThreshold: data?.recognitionThreshold ?? DEFAULT_RECOGNITION_THRESHOLD,
  };
}

/**
 * Merges the given fields into `users/{userId}`, creating the doc if it
 * doesn't exist yet. No validation/clamping here — that belongs to the
 * Settings API route (Plan 2), which knows the UI's 50%-100% bound.
 */
export async function updateUserProfile(
  userId: string,
  fields: Partial<UserProfile>
): Promise<void> {
  const db = getFirestore(getAdminApp());
  await db.collection('users').doc(userId).set(fields, { merge: true });
}
