import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
}));

vi.mock('@/lib/firebase/client', () => ({
  getFirebaseClientApp: vi.fn(),
}));

vi.mock('@/components/GoogleSignInButton', () => ({
  default: () => null,
}));

import LoginPage from './page';

describe('LoginPage', () => {
  test("the login page's submit button uses bg-ink/text-paper", () => {
    render(<LoginPage />);

    const button = screen.getByRole('button', { name: /^log in$/i });
    expect(button.className).toContain('bg-ink');
    expect(button.className).toContain('text-paper');
  });
});
