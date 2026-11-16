import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/firebase/server', () => ({
  getAuthedUser: vi.fn(),
}));

vi.mock('@/lib/users/userProfile', () => ({
  getUserProfile: vi.fn(),
}));

import { getAuthedUser } from '@/lib/firebase/server';
import { getUserProfile } from '@/lib/users/userProfile';
import RootLayout from './layout';

const mockGetAuthedUser = getAuthedUser as unknown as ReturnType<typeof vi.fn>;
const mockGetUserProfile = getUserProfile as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockGetAuthedUser.mockReset();
  mockGetUserProfile.mockReset();
});

describe('RootLayout', () => {
  test("sets data-theme from the signed-in user's profile", async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    mockGetUserProfile.mockResolvedValue({
      nativeLanguage: null,
      avatarUrl: null,
      theme: 'dark',
      recognitionThreshold: 0.8,
    });

    const jsx = await RootLayout({ children: <div>content</div> });

    expect(jsx.type).toBe('html');
    expect(jsx.props['data-theme']).toBe('dark');
    expect(mockGetUserProfile).toHaveBeenCalledWith('user-1');
  });

  test('a logged-out visitor gets no forced theme (defaults to system)', async () => {
    mockGetAuthedUser.mockResolvedValue(null);

    const jsx = await RootLayout({ children: <div>content</div> });

    expect(jsx.type).toBe('html');
    expect(jsx.props['data-theme']).toBeUndefined();
    expect(mockGetUserProfile).not.toHaveBeenCalled();
  });

  test('a signed-in user with theme "system" gets no forced theme either', async () => {
    mockGetAuthedUser.mockResolvedValue({ uid: 'user-1' });
    mockGetUserProfile.mockResolvedValue({
      nativeLanguage: null,
      avatarUrl: null,
      theme: 'system',
      recognitionThreshold: 0.8,
    });

    const jsx = await RootLayout({ children: <div>content</div> });

    expect(jsx.props['data-theme']).toBeUndefined();
  });
});
