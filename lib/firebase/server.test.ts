// @vitest-environment node
import { describe, test, expect, vi } from 'vitest';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({ getAdminApp: vi.fn(() => ({})) }));
vi.mock('firebase-admin/auth', () => ({ getAuth: vi.fn() }));

import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { getAuthedUser } from './server';

const mockCookies = cookies as unknown as ReturnType<typeof vi.fn>;
const mockGetAuth = getAuth as unknown as ReturnType<typeof vi.fn>;

describe('getAuthedUser', () => {
  test('returns the uid when the session cookie verifies', async () => {
    const verifySessionCookie = vi.fn().mockResolvedValue({ uid: 'user-1' });
    mockGetAuth.mockReturnValue({ verifySessionCookie });
    mockCookies.mockResolvedValue({
      get: vi.fn((name: string) => (name === 'session' ? { value: 'cookie-value' } : undefined)),
    });

    const result = await getAuthedUser();

    expect(result).toEqual({ uid: 'user-1' });
    expect(verifySessionCookie).toHaveBeenCalledWith('cookie-value', true);
  });

  test('returns null when there is no session cookie', async () => {
    const verifySessionCookie = vi.fn();
    mockGetAuth.mockReturnValue({ verifySessionCookie });
    mockCookies.mockResolvedValue({
      get: vi.fn(() => undefined),
    });

    const result = await getAuthedUser();

    expect(result).toBeNull();
    expect(verifySessionCookie).not.toHaveBeenCalled();
  });

  test('returns null when verification throws (expired/invalid cookie)', async () => {
    const verifySessionCookie = vi.fn().mockRejectedValue(new Error('invalid cookie'));
    mockGetAuth.mockReturnValue({ verifySessionCookie });
    mockCookies.mockResolvedValue({
      get: vi.fn((name: string) => (name === 'session' ? { value: 'bad-cookie' } : undefined)),
    });

    const result = await getAuthedUser();

    expect(result).toBeNull();
  });
});
