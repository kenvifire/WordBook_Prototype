// @vitest-environment node
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('@/lib/firebase/admin', () => ({ getAdminApp: vi.fn(() => ({})) }));
vi.mock('firebase-admin/auth', () => ({ getAuth: vi.fn() }));

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { getAuth } from 'firebase-admin/auth';
import { POST, DELETE } from './route';

const mockCookies = cookies as unknown as ReturnType<typeof vi.fn>;
const mockGetAuth = getAuth as unknown as ReturnType<typeof vi.fn>;

function makeRequest(body: unknown, { omitBody = false }: { omitBody?: boolean } = {}) {
  return new NextRequest('http://localhost/api/auth/session', {
    method: 'POST',
    body: omitBody ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  mockCookies.mockReset();
  mockGetAuth.mockReset();
});

describe('POST /api/auth/session', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    vi.stubEnv('NODE_ENV', originalNodeEnv ?? 'test');
  });

  test('exchanges a valid idToken for a session cookie, with secure: false outside production (Minor #6: Safari rejects Secure cookies over plain-HTTP localhost)', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const createSessionCookie = vi.fn().mockResolvedValue('cookie-value');
    mockGetAuth.mockReturnValue({ createSessionCookie });
    const set = vi.fn();
    mockCookies.mockResolvedValue({ set, delete: vi.fn() });

    const response = await POST(makeRequest({ idToken: 'abc' }));

    expect(response.status).toBe(204);
    expect(createSessionCookie).toHaveBeenCalledWith('abc', {
      expiresIn: 1000 * 60 * 60 * 24 * 14,
    });
    expect(set).toHaveBeenCalledWith(
      'session',
      'cookie-value',
      expect.objectContaining({ httpOnly: true, secure: false, path: '/' })
    );
  });

  test('sets secure: true in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const createSessionCookie = vi.fn().mockResolvedValue('cookie-value');
    mockGetAuth.mockReturnValue({ createSessionCookie });
    const set = vi.fn();
    mockCookies.mockResolvedValue({ set, delete: vi.fn() });

    await POST(makeRequest({ idToken: 'abc' }));

    expect(set).toHaveBeenCalledWith(
      'session',
      'cookie-value',
      expect.objectContaining({ secure: true })
    );
  });

  test('returns 401 when createSessionCookie rejects (invalid/expired idToken)', async () => {
    const createSessionCookie = vi.fn().mockRejectedValue(new Error('invalid idToken'));
    mockGetAuth.mockReturnValue({ createSessionCookie });
    const set = vi.fn();
    mockCookies.mockResolvedValue({ set, delete: vi.fn() });

    const response = await POST(makeRequest({ idToken: 'bad' }));

    expect(response.status).toBe(401);
    expect(set).not.toHaveBeenCalled();
  });

  test('returns 400 when idToken is missing', async () => {
    const set = vi.fn();
    mockCookies.mockResolvedValue({ set, delete: vi.fn() });

    const response = await POST(makeRequest({}));

    expect(response.status).toBe(400);
    expect(set).not.toHaveBeenCalled();
  });

  test('returns 400 when the body is malformed (non-JSON)', async () => {
    const set = vi.fn();
    mockCookies.mockResolvedValue({ set, delete: vi.fn() });

    const response = await POST(makeRequest(undefined, { omitBody: true }));

    expect(response.status).toBe(400);
    expect(set).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/auth/session', () => {
  test("revokes the session's refresh tokens, then clears the cookie", async () => {
    const get = vi.fn().mockReturnValue({ value: 'cookie-value' });
    const del = vi.fn();
    mockCookies.mockResolvedValue({ set: vi.fn(), delete: del, get });
    const verifySessionCookie = vi.fn().mockResolvedValue({ uid: 'user-1' });
    const revokeRefreshTokens = vi.fn().mockResolvedValue(undefined);
    mockGetAuth.mockReturnValue({ verifySessionCookie, revokeRefreshTokens });

    const response = await DELETE();

    expect(verifySessionCookie).toHaveBeenCalledWith('cookie-value');
    expect(revokeRefreshTokens).toHaveBeenCalledWith('user-1');
    expect(response.status).toBe(204);
    expect(del).toHaveBeenCalledWith('session');
  });

  test('clears the cookie even when there is no session cookie to revoke', async () => {
    const get = vi.fn().mockReturnValue(undefined);
    const del = vi.fn();
    mockCookies.mockResolvedValue({ set: vi.fn(), delete: del, get });

    const response = await DELETE();

    expect(response.status).toBe(204);
    expect(del).toHaveBeenCalledWith('session');
    expect(mockGetAuth).not.toHaveBeenCalled();
  });

  test('clears the cookie even when the cookie is already invalid (verifySessionCookie rejects)', async () => {
    const get = vi.fn().mockReturnValue({ value: 'bad-cookie' });
    const del = vi.fn();
    mockCookies.mockResolvedValue({ set: vi.fn(), delete: del, get });
    const verifySessionCookie = vi.fn().mockRejectedValue(new Error('invalid'));
    mockGetAuth.mockReturnValue({ verifySessionCookie, revokeRefreshTokens: vi.fn() });

    const response = await DELETE();

    expect(response.status).toBe(204);
    expect(del).toHaveBeenCalledWith('session');
  });
});
