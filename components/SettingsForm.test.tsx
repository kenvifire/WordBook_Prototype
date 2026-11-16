import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserProfile } from '@/lib/users/userProfile';

const mockRefresh = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, push: mockPush }),
}));

import SettingsForm from './SettingsForm';

const baseProfile: UserProfile = {
  nativeLanguage: 'Spanish',
  avatarUrl: null,
  theme: 'light',
  recognitionThreshold: 0.8,
};

function mockFetchOnce(response: { ok: boolean; json: () => Promise<unknown> }) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(response);
}

beforeEach(() => {
  mockRefresh.mockReset();
  mockPush.mockReset();
  global.fetch = vi.fn();
});

describe('SettingsForm', () => {
  test('shows the current nativeLanguage/theme/threshold as initial form state', () => {
    render(<SettingsForm initialProfile={baseProfile} />);

    expect(screen.getByLabelText(/native language/i)).toHaveValue('Spanish');
    expect(screen.getByRole('button', { name: /^light$/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: /^dark$/i })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    const slider = screen.getByLabelText(/recognition threshold/i) as HTMLInputElement;
    expect(slider.value).toBe('80');
  });

  test('moving the threshold slider and saving PATCHes the percent value', async () => {
    mockFetchOnce({ ok: true, json: async () => ({ ok: true }) });

    const user = userEvent.setup();
    render(<SettingsForm initialProfile={baseProfile} />);

    const slider = screen.getByLabelText(/recognition threshold/i) as HTMLInputElement;
    // jsdom doesn't implement native keyboard stepping for range inputs,
    // so drive the value change the way a real browser's slider drag
    // would ultimately fire: a single change event with the new value.
    fireEvent.change(slider, { target: { value: '90' } });

    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/api/settings');
    expect(init.method).toBe('PATCH');
    const body = JSON.parse(init.body as string);
    expect(body.recognitionThresholdPercent).toBe(90);
    expect(body.nativeLanguage).toBe('Spanish');
    expect(body.theme).toBe('light');
    // Must be a 50-100 integer percent, never a 0-1 fraction.
    expect(body.recognitionThresholdPercent).toBeGreaterThanOrEqual(50);
    expect(body.recognitionThresholdPercent).toBeLessThanOrEqual(100);

    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
  });

  test('C1: omits nativeLanguage from the PATCH body when it is empty, instead of sending an empty string', async () => {
    mockFetchOnce({ ok: true, json: async () => ({ ok: true }) });

    const user = userEvent.setup();
    render(
      <SettingsForm
        initialProfile={{ ...baseProfile, nativeLanguage: null }}
      />
    );

    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(init.body as string);

    expect(body).not.toHaveProperty('nativeLanguage');
    // theme/threshold must still be sent normally.
    expect(body.theme).toBe('light');
    expect(body.recognitionThresholdPercent).toBe(80);

    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
  });

  test('selecting a different theme and saving sends that theme', async () => {
    mockFetchOnce({ ok: true, json: async () => ({ ok: true }) });

    const user = userEvent.setup();
    render(<SettingsForm initialProfile={baseProfile} />);

    await user.click(screen.getByRole('button', { name: /^dark$/i }));
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse(
      (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body as string
    );
    expect(body.theme).toBe('dark');
  });

  test('choosing an avatar file POSTs it to /api/settings/avatar immediately', async () => {
    mockFetchOnce({ ok: true, json: async () => ({ avatarUrl: 'https://example.com/a.png' }) });

    const user = userEvent.setup();
    render(<SettingsForm initialProfile={baseProfile} />);

    const avatarFile = new File(['fake image bytes'], 'avatar.png', { type: 'image/png' });
    const fileInput = screen.getByLabelText(/avatar/i);
    await user.upload(fileInput, avatarFile);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/api/settings/avatar');
    expect(init.method).toBe('POST');
    const body = init.body as FormData;
    expect(body.get('file')).toBeInstanceOf(File);
  });

  test('shows the API error message when the settings PATCH fails', async () => {
    mockFetchOnce({ ok: false, json: async () => ({ error: 'Invalid theme' }) });

    const user = userEvent.setup();
    render(<SettingsForm initialProfile={baseProfile} />);

    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(await screen.findByText('Invalid theme')).toBeInTheDocument();
    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
