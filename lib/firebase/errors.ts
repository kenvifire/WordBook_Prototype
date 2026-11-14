// The gRPC status code for ALREADY_EXISTS (google-gax's `Status.ALREADY_EXISTS`,
// also `@google-cloud/firestore`'s internal `StatusCode.ALREADY_EXISTS`).
//
// Verified against the installed firebase-admin/@google-cloud/firestore
// packages: a failed `DocumentReference.create()` rejects with a raw
// `GoogleError` whose `.code` is this *number*, not a string like
// 'already-exists'. (That string-code shape belongs to other Firebase Admin
// surfaces — Auth, Functions, Remote Config, etc. — which wrap gRPC errors
// into their own `FirebaseError` subclasses. The core Firestore client used
// by `firebase-admin/firestore` does not do that wrapping; it surfaces the
// gRPC error as-is.)
export const FIRESTORE_ALREADY_EXISTS_CODE = 6;

export function isAlreadyExistsError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === FIRESTORE_ALREADY_EXISTS_CODE
  );
}
