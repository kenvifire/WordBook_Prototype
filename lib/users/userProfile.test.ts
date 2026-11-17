import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(),
}));

vi.mock('@/lib/firebase/admin', () => ({ getAdminApp: vi.fn(() => ({})) }));

import { getFirestore } from 'firebase-admin/firestore';
import { invalidatePrefix } from '@/lib/cache/serverCache';
import { getUserProfile, updateUserProfile } from './userProfile';

const mockGetFirestore = getFirestore as unknown as ReturnType<typeof vi.fn>;

type StoredDoc = Record<string, unknown>;

// A minimal fake Firestore, backed by an in-memory Map keyed by full
// document path, supporting exactly what userProfile.ts needs: doc
// get/set — mirroring the fake-store style used in
// lib/sections/sectionService.test.ts rather than a chain-mocking stub.
function createFakeFirestore() {
  const store = new Map<string, StoredDoc>();
  const setCalls: { path: string; data: Record<string, unknown>; options: unknown }[] = [];
  const getCalls: string[] = [];

  function makeDocRef(path: string): any {
    const id = path.split('/').pop()!;
    return {
      id,
      path,
      async get() {
        getCalls.push(path);
        const data = store.get(path);
        return {
          exists: data !== undefined,
          id,
          data: () => (data ? { ...data } : undefined),
        };
      },
      async set(data: Record<string, unknown>, options?: unknown) {
        setCalls.push({ path, data, options });
        const existing = store.get(path);
        if (options && (options as { merge?: boolean }).merge) {
          store.set(path, { ...existing, ...data });
        } else {
          store.set(path, { ...data });
        }
      },
    };
  }

  function makeCollectionRef(path: string): any {
    return {
      path,
      doc(id: string) {
        return makeDocRef(`${path}/${id}`);
      },
    };
  }

  const db = {
    collection(name: string) {
      return makeCollectionRef(name);
    },
  };

  return { db, store, setCalls, getCalls };
}

function putUser(store: Map<string, StoredDoc>, userId: string, data: StoredDoc) {
  store.set(`users/${userId}`, { ...data });
}

beforeEach(() => {
  mockGetFirestore.mockReset();
  // The profile cache is module-level state shared across tests in this
  // file; clear it so one test's cached read never leaks into another's.
  invalidatePrefix('profile:');
});

describe('getUserProfile', () => {
  test('returns defaults when no profile doc exists', async () => {
    const { db } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);

    const profile = await getUserProfile('u1');

    expect(profile).toEqual({
      nativeLanguage: null,
      avatarUrl: null,
      theme: 'system',
      recognitionThreshold: 0.8,
    });
  });

  test('fills in only the missing fields when the doc exists but is partial', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    putUser(store, 'u1', { nativeLanguage: 'spanish' });

    const profile = await getUserProfile('u1');

    expect(profile.nativeLanguage).toBe('spanish');
    expect(profile.recognitionThreshold).toBe(0.8);
    expect(profile.theme).toBe('system');
    expect(profile.avatarUrl).toBeNull();
  });

  test('a fully-populated doc is returned as-is', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    putUser(store, 'u1', {
      nativeLanguage: 'french',
      avatarUrl: 'https://example.com/a.png',
      theme: 'dark',
      recognitionThreshold: 0.9,
    });

    const profile = await getUserProfile('u1');

    expect(profile).toEqual({
      nativeLanguage: 'french',
      avatarUrl: 'https://example.com/a.png',
      theme: 'dark',
      recognitionThreshold: 0.9,
    });
  });
});

describe('updateUserProfile', () => {
  test('merges fields without clobbering others', async () => {
    const { db, store, setCalls } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);
    putUser(store, 'u1', { nativeLanguage: 'spanish', theme: 'light' });

    await updateUserProfile('u1', { theme: 'dark' });

    expect(setCalls).toHaveLength(1);
    expect(setCalls[0].path).toBe('users/u1');
    expect(setCalls[0].data).toEqual({ theme: 'dark' });
    expect(setCalls[0].options).toEqual({ merge: true });

    // The underlying store reflects the merge: untouched field survives.
    expect(store.get('users/u1')).toEqual({ nativeLanguage: 'spanish', theme: 'dark' });
  });

  test('creates the doc with merge semantics when none exists yet', async () => {
    const { db, store } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);

    await updateUserProfile('u2', { nativeLanguage: 'german' });

    expect(store.get('users/u2')).toEqual({ nativeLanguage: 'german' });
  });
});

describe('getUserProfile caching', () => {
  test('a second getUserProfile call for the same uid does not re-query Firestore', async () => {
    const { db, getCalls } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);

    await getUserProfile('u1');
    await getUserProfile('u1');

    expect(getCalls).toHaveLength(1);
  });

  test('updateUserProfile invalidates the cached profile so the next getUserProfile reflects the change', async () => {
    const { db } = createFakeFirestore();
    mockGetFirestore.mockReturnValue(db);

    await getUserProfile('u1'); // warms the cache with defaults
    await updateUserProfile('u1', { recognitionThreshold: 1.0 });
    const profile = await getUserProfile('u1');

    expect(profile.recognitionThreshold).toBe(1.0); // not the stale cached 0.8
  });
});
