import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/firebase/server', () => ({
  getAuthedUser: vi.fn(),
}));

vi.mock('@/lib/users/userProfile', () => ({
  getUserProfile: vi.fn(),
}));

// next/font/google's real runtime module is a build-time-only stub (it's
// rewritten by Next's own compiler, not runnable under plain Vitest/jsdom) —
// mocked here with controlled return values so the test can assert against
// a known string, the same way this codebase mocks other Next/Firebase
// modules that don't run outside their real host.
vi.mock('next/font/google', () => ({
  Figtree: vi.fn(() => ({
    variable: 'mock-font-figtree-variable',
    className: 'mock-figtree-class',
  })),
  Source_Serif_4: vi.fn(() => ({
    variable: 'mock-font-source-serif-variable',
    className: 'mock-source-serif-class',
  })),
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

  test('applies the ui and reading font variable classes to the body', async () => {
    mockGetAuthedUser.mockResolvedValue(null);

    const jsx = await RootLayout({ children: <div>content</div> });
    const body = jsx.props.children;

    expect(body.props.className).toContain('mock-font-figtree-variable');
    expect(body.props.className).toContain('mock-font-source-serif-variable');
  });
});
