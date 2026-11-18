// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/firebase/server', () => ({
  getAuthedUser: vi.fn(),
}));

vi.mock('@/lib/users/userProfile', () => ({
  updateUserProfile: vi.fn(),
}));

import { NextRequest } from 'next/server';
import { getAuthedUser } from '@/lib/firebase/server';
import { updateUserProfile } from '@/lib/users/userProfile';
import { PATCH } from './route';

const mockGetAuthedUser = getAuthedUser as unknown as ReturnType<typeof vi.fn>;
const mockUpdateUserProfile = updateUserProfile as unknown as ReturnType<typeof vi.fn>;

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/settings', {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockGetAuthedUser.mockReset();
  mockUpdateUserProfile.mockReset();
});

describe('PATCH /api/settings', () => {
  test('rejects a recognitionThresholdPercent below 50 or above 100', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const tooLow = await PATCH(makeRequest({ recognitionThresholdPercent: 10 }));
    expect(tooLow.status).toBe(400);
    expect(mockUpdateUserProfile).not.toHaveBeenCalled();

    const tooHigh = await PATCH(makeRequest({ recognitionThresholdPercent: 150 }));
    expect(tooHigh.status).toBe(400);
    expect(mockUpdateUserProfile).not.toHaveBeenCalled();
  });

  test('converts a valid percent to a stored fraction', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const response = await PATCH(makeRequest({ recognitionThresholdPercent: 90 }));

    expect(response.status).toBe(200);
    expect(mockUpdateUserProfile).toHaveBeenCalledWith('user-1', { recognitionThreshold: 0.9 });
  });

  test('requires auth', async () => {
    mockGetAuthedUser.mockResolvedValue(null);

    const response = await PATCH(makeRequest({ recognitionThresholdPercent: 90 }));

    expect(response.status).toBe(401);
    expect(mockUpdateUserProfile).not.toHaveBeenCalled();
  });

  test('rejects a non-integer recognitionThresholdPercent', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const response = await PATCH(makeRequest({ recognitionThresholdPercent: 75.5 }));

    expect(response.status).toBe(400);
    expect(mockUpdateUserProfile).not.toHaveBeenCalled();
  });

  test('rejects an invalid theme value', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const response = await PATCH(makeRequest({ theme: 'blue' }));

    expect(response.status).toBe(400);
    expect(mockUpdateUserProfile).not.toHaveBeenCalled();
  });

  test('accepts a valid theme value', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const response = await PATCH(makeRequest({ theme: 'dark' }));

    expect(response.status).toBe(200);
    expect(mockUpdateUserProfile).toHaveBeenCalledWith('user-1', { theme: 'dark' });
  });

  test('rejects an empty-string nativeLanguage', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const response = await PATCH(makeRequest({ nativeLanguage: '' }));

    expect(response.status).toBe(400);
    expect(mockUpdateUserProfile).not.toHaveBeenCalled();
  });

  test('accepts a valid nativeLanguage and builds a partial update from only the fields present', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const response = await PATCH(makeRequest({ nativeLanguage: 'es' }));

    expect(response.status).toBe(200);
    expect(mockUpdateUserProfile).toHaveBeenCalledWith('user-1', { nativeLanguage: 'es' });
  });

  test('combines multiple present fields into one partial update', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const response = await PATCH(
      makeRequest({ nativeLanguage: 'fr', theme: 'light', recognitionThresholdPercent: 75 })
    );

    expect(response.status).toBe(200);
    expect(mockUpdateUserProfile).toHaveBeenCalledWith('user-1', {
      nativeLanguage: 'fr',
      theme: 'light',
      recognitionThreshold: 0.75,
    });
  });

  test('a malformed request body returns 400, not 500', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });

    const request = new NextRequest('http://localhost/api/settings', {
      method: 'PATCH',
      body: 'not valid json{{{',
    });

    const response = await PATCH(request);

    expect(response.status).toBe(400);
    expect(mockUpdateUserProfile).not.toHaveBeenCalled();
  });
});
