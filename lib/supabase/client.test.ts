import { describe, test, expect, vi } from 'vitest';

vi.mock('@supabase/ssr', () => ({ createBrowserClient: vi.fn(() => 'fake-client') }));

import { createClient } from './client';

test('createClient builds a browser client from NEXT_PUBLIC env vars', () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  expect(createClient()).toBe('fake-client');
});
