import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
}));

vi.mock('@/lib/firebase/client', () => ({
  getFirebaseClientApp: vi.fn(),
}));

vi.mock('@/components/GoogleSignInButton', () => ({
  default: () => null,
}));

import SignupPage from './page';

describe('SignupPage', () => {
  test("the signup page's submit button uses bg-ink/text-paper", () => {
    render(<SignupPage />);

    const button = screen.getByRole('button', { name: /^sign up$/i });
    expect(button.className).toContain('bg-ink');
    expect(button.className).toContain('text-paper');
  });
});
