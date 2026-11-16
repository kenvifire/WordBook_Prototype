// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/firebase/server', () => ({
  getAuthedUser: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({
  getAdminApp: vi.fn(() => ({})),
}));

vi.mock('firebase-admin/storage', () => ({
  getStorage: vi.fn(),
}));

vi.mock('@/lib/users/userProfile', () => ({
  updateUserProfile: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { getAuthedUser } from '@/lib/firebase/server';
import { getStorage } from 'firebase-admin/storage';
import { updateUserProfile } from '@/lib/users/userProfile';
import { POST } from './route';

const mockGetAuthedUser = getAuthedUser as unknown as ReturnType<typeof vi.fn>;
const mockGetStorage = getStorage as unknown as ReturnType<typeof vi.fn>;
const mockUpdateUserProfile = updateUserProfile as unknown as ReturnType<typeof vi.fn>;

function makeStorageMock(save: ReturnType<typeof vi.fn>, publicUrl: ReturnType<typeof vi.fn>) {
  const file = vi.fn((_path: string) => ({ save, publicUrl }));
  const bucket = vi.fn(() => ({ file }));
  return { bucket, file };
}

function makeRequest(formData: FormData) {
  return new NextRequest('http://localhost/api/settings/avatar', {
    method: 'POST',
    body: formData,
  });
}

beforeEach(() => {
  mockGetAuthedUser.mockReset();
  mockGetStorage.mockReset();
  mockUpdateUserProfile.mockReset();
});

describe('POST /api/settings/avatar', () => {
  test('uploads the file and stores its URL on the profile', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    const save = vi.fn().mockResolvedValue(undefined);
    const publicUrl = vi.fn(() => 'https://storage.googleapis.com/fake-bucket/avatars/user-1/fake-uuid');
    const storage = makeStorageMock(save, publicUrl);
    mockGetStorage.mockReturnValue(storage);
    mockUpdateUserProfile.mockResolvedValue(undefined);

    const formData = new FormData();
    const file = new File(['fake image bytes'], 'avatar.png', { type: 'image/png' });
    formData.set('file', file);

    const response = await POST(makeRequest(formData));
    const body = await response.json();

    expect(response.status).toBe(200);

    // Uploaded under the avatars/{uid}/{uuid} path convention.
    expect(storage.file).toHaveBeenCalledTimes(1);
    const filePath = storage.file.mock.calls[0][0] as string;
    expect(filePath).toMatch(/^avatars\/user-1\/[0-9a-f-]+$/);

    const bufferArg = save.mock.calls[0][0];
    expect(Buffer.isBuffer(bufferArg)).toBe(true);
    expect(save).toHaveBeenCalledWith(bufferArg, { contentType: 'image/png' });

    expect(mockUpdateUserProfile).toHaveBeenCalledWith('user-1', {
      avatarUrl: 'https://storage.googleapis.com/fake-bucket/avatars/user-1/fake-uuid',
    });
    expect(body).toEqual({
      avatarUrl: 'https://storage.googleapis.com/fake-bucket/avatars/user-1/fake-uuid',
    });
  });

  test('returns 401 when there is no authenticated user', async () => {
    mockGetAuthedUser.mockResolvedValue(null);

    const formData = new FormData();
    const file = new File(['fake image bytes'], 'avatar.png', { type: 'image/png' });
    formData.set('file', file);

    const response = await POST(makeRequest(formData));

    expect(response.status).toBe(401);
    expect(mockGetStorage).not.toHaveBeenCalled();
    expect(mockUpdateUserProfile).not.toHaveBeenCalled();
  });

  test('a missing file returns 400 instead of throwing', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const formData = new FormData();

    const response = await POST(makeRequest(formData));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: 'file is required' });
    expect(mockGetStorage).not.toHaveBeenCalled();
    expect(mockUpdateUserProfile).not.toHaveBeenCalled();
  });
});
