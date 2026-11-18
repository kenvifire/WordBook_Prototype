import { NextRequest, NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/firebase/server';
import { updateUserProfile, type Theme, type UserProfile } from '@/lib/users/userProfile';

const VALID_THEMES: readonly Theme[] = ['light', 'dark', 'system'];

type SettingsBody = {
  nativeLanguage?: unknown;
  theme?: unknown;
  recognitionThresholdPercent?: unknown;
};

/**
 * PATCH /api/settings
 *
 * The only place in the app that converts the UI's 50-100 integer percent
 * recognition threshold into the 0-1 fraction stored on UserProfile. No
 * other layer (client or otherwise) should do this conversion.
 */
export async function PATCH(request: NextRequest) {
  const user = await getAuthedUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // A malformed body (e.g. no body, or non-JSON) would otherwise throw out
  // of request.json() and surface as an uncaught 500, instead of the 400 a
  // bad request should get — mirrors the guard in
  // app/api/words/[wordId]/rate/route.ts.
  const body = (await request.json().catch(() => null)) as SettingsBody | null;

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const partial: Partial<UserProfile> = {};

  if (body.nativeLanguage !== undefined) {
    if (typeof body.nativeLanguage !== 'string' || body.nativeLanguage.length === 0) {
      return NextResponse.json({ error: 'Invalid nativeLanguage' }, { status: 400 });
    }
    partial.nativeLanguage = body.nativeLanguage;
  }

  if (body.theme !== undefined) {
    if (typeof body.theme !== 'string' || !VALID_THEMES.includes(body.theme as Theme)) {
      return NextResponse.json({ error: 'Invalid theme' }, { status: 400 });
    }
    partial.theme = body.theme as Theme;
  }

  if (body.recognitionThresholdPercent !== undefined) {
    const percent = body.recognitionThresholdPercent;
    if (
      typeof percent !== 'number' ||
      !Number.isInteger(percent) ||
      percent < 50 ||
      percent > 100
    ) {
      return NextResponse.json({ error: 'Invalid recognitionThresholdPercent' }, { status: 400 });
    }
    partial.recognitionThreshold = percent / 100;
  }

  await updateUserProfile(user.uid, partial);

  return NextResponse.json({ ok: true });
}
