'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Theme, UserProfile } from '@/lib/users/userProfile';

const THEMES: readonly Theme[] = ['light', 'dark', 'system'];

type Props = {
  initialProfile: UserProfile;
};

export default function SettingsForm({ initialProfile }: Props) {
  const router = useRouter();
  const [nativeLanguage, setNativeLanguage] = useState(initialProfile.nativeLanguage ?? '');
  const [theme, setTheme] = useState<Theme>(initialProfile.theme);
  // The profile stores a 0-1 fraction; the UI (and the PATCH body) work in
  // a 50-100 integer percent — the conversion happens only at the edges
  // here, never inside the API route's own percent->fraction conversion.
  const [thresholdPercent, setThresholdPercent] = useState(
    Math.round(initialProfile.recognitionThreshold * 100)
  );
  const [avatarUrl, setAvatarUrl] = useState(initialProfile.avatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // C1: an empty (or whitespace-only) nativeLanguage is what a brand-new
      // user's profile starts as (nativeLanguage: null -> '' in state here).
      // The API route 400s on an empty-string nativeLanguage, so sending it
      // at all would make saving ANY settings change fail for such a user.
      // Omit the field entirely in that case rather than sending ''.
      const trimmedNativeLanguage = nativeLanguage.trim();
      const body: Record<string, unknown> = {
        theme,
        recognitionThresholdPercent: thresholdPercent,
      };
      if (trimmedNativeLanguage.length > 0) {
        body.nativeLanguage = nativeLanguage;
      }

      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      let data: { error?: string } = {};
      try {
        data = await res.json();
      } catch {
        // Response body may be empty; fall through to the generic error below.
      }

      if (!res.ok) {
        setError(data.error ?? 'Failed to save settings');
        return;
      }

      router.refresh();
    } catch {
      setError('Failed to save settings');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/settings/avatar', { method: 'POST', body: formData });
      let data: { error?: string; avatarUrl?: string } = {};
      try {
        data = await res.json();
      } catch {
        // Response body may be empty; fall through to the generic error below.
      }

      if (!res.ok) {
        setError(data.error ?? 'Failed to upload avatar');
        return;
      }

      if (data.avatarUrl) {
        setAvatarUrl(data.avatarUrl);
      }
      router.refresh();
    } catch {
      setError('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Native language</span>
        <input
          type="text"
          value={nativeLanguage}
          onChange={(e) => setNativeLanguage(e.target.value)}
          className="rounded border px-3 py-2"
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Theme</span>
        <div role="group" aria-label="Theme" className="flex gap-2">
          {THEMES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              aria-pressed={theme === t}
              className={`rounded px-3 py-1 text-sm capitalize ${
                theme === t ? 'bg-black text-white' : 'border'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Recognition threshold ({thresholdPercent}%)</span>
        <input
          type="range"
          min={50}
          max={100}
          step={1}
          value={thresholdPercent}
          onChange={(e) => setThresholdPercent(Number(e.target.value))}
          aria-label="Recognition threshold"
          className="w-full"
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">Avatar</span>
        {avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="Current avatar"
            className="mb-2 h-16 w-16 rounded-full object-cover"
          />
        )}
        <input
          type="file"
          accept="image/*"
          aria-label="Avatar"
          onChange={handleAvatarChange}
          disabled={uploadingAvatar}
          className="rounded border px-3 py-2"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
      >
        {submitting ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}
