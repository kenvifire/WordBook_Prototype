import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockSignInWithPopup = vi.fn();
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => 'fake-auth'),
  GoogleAuthProvider: vi.fn(function GoogleAuthProvider(this: unknown) {
    return this;
  }),
  signInWithPopup: (...args: unknown[]) => mockSignInWithPopup(...args),
}));

vi.mock('@/lib/firebase/client', () => ({
  getFirebaseClientApp: vi.fn(() => 'fake-app'),
}));

import GoogleSignInButton from './GoogleSignInButton';

beforeEach(() => {
  mockPush.mockClear();
  mockSignInWithPopup.mockReset();
  global.fetch = vi.fn();
});

describe('GoogleSignInButton', () => {
  test('clicking signs in with a Google popup, exchanges the idToken for a session, and redirects to /bookshelf', async () => {
    mockSignInWithPopup.mockResolvedValue({
      user: { getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    render(<GoogleSignInButton />);
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/bookshelf'));

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/session',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ idToken: 'fake-id-token' }),
      })
    );
  });

  test('shows an error message and does not redirect when the popup sign-in fails', async () => {
    mockSignInWithPopup.mockRejectedValue(new Error('popup closed by user'));

    render(<GoogleSignInButton />);
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => expect(screen.getByText('popup closed by user')).toBeInTheDocument());
    expect(mockPush).not.toHaveBeenCalled();
  });

  test('shows an error and does not redirect when the session exchange fails', async () => {
    mockSignInWithPopup.mockResolvedValue({
      user: { getIdToken: vi.fn().mockResolvedValue('fake-id-token') },
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });

    render(<GoogleSignInButton />);
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => expect(screen.getByText('Failed to establish session')).toBeInTheDocument());
    expect(mockPush).not.toHaveBeenCalled();
  });
});
