import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from 'firebase-admin/storage';
import { getAdminApp } from '@/lib/firebase/admin';
import { getAuthedUser } from '@/lib/firebase/server';
import { updateUserProfile } from '@/lib/users/userProfile';

/**
 * POST /api/settings/avatar
 *
 * Multipart upload (field `file`). Mirrors app/api/books/route.ts's
 * epub-upload pattern: buffer the file, save it to Storage under a
 * uid-scoped path, then persist the resulting URL on the user's profile.
 * Unlike the epub upload, a Storage failure here IS fatal — the avatar
 * has nothing useful to fall back to without a stored URL.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthedUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileRef = getStorage(getAdminApp())
    .bucket()
    .file(`avatars/${user.uid}/${randomUUID()}`);

  await fileRef.save(buffer, { contentType: file.type });

  // storage.rules governs requests through firebasestorage.googleapis.com
  // (the Firebase client SDK/REST API) only — it has no effect on the
  // storage.googleapis.com host that `.publicUrl()` would return, and GCS
  // buckets have no public IAM binding by default, so that URL 403s for
  // everyone, including the owner. A signed URL is the only thing that
  // actually works here. The far-future expiry approximates "doesn't
  // expire" for a prototype with no refresh flow.
  const [avatarUrl] = await fileRef.getSignedUrl({
    action: 'read',
    expires: '03-01-2099',
  });
  await updateUserProfile(user.uid, { avatarUrl });

  return NextResponse.json({ avatarUrl }, { status: 200 });
}
