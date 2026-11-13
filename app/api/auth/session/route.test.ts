// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from 'vitest';

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
  test('exchanges a valid idToken for a session cookie', async () => {
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
      expect.objectContaining({ httpOnly: true, secure: true, path: '/' })
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
  test('clears the session cookie', async () => {
    const del = vi.fn();
    mockCookies.mockResolvedValue({ set: vi.fn(), delete: del });

    const response = await DELETE();

    expect(response.status).toBe(204);
    expect(del).toHaveBeenCalledWith('session');
  });
});
