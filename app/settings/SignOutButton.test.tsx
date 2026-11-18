import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('@/lib/firebase/client', () => ({
  getFirebaseClientApp: vi.fn(),
}));

import SignOutButton from './SignOutButton';

describe('SignOutButton', () => {
  test('uses the design-token primary pattern, not ad-hoc bg-black', () => {
    render(<SignOutButton />);

    const button = screen.getByRole('button', { name: /sign out/i });
    expect(button.className).toContain('bg-ink');
    expect(button.className).toContain('text-paper');
    expect(button.className).not.toContain('bg-black');
  });
});
