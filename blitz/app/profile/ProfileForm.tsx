'use client';

import { useState, FormEvent } from 'react';

interface ProfileFormProps {
  initialBusinessName: string;
  clerkEmail?: string;
  clerkName?: string;
}

export function ProfileForm({ initialBusinessName, clerkEmail, clerkName }: ProfileFormProps) {
  const [businessName, setBusinessName] = useState(initialBusinessName);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/business', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: businessName }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: 'Unable to update business name' }));
        throw new Error(payload.error || 'Unable to update business name');
      }

      const payload = await response.json();
      setBusinessName(payload.business.name);
      setMessage('Business name updated successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 shadow"
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Business Name
          </label>
          <input
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            required
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-gray-400 focus:border-slate-900 focus:outline-none focus:ring-0 transition"
            placeholder="Acme Robotics"
          />
          <p className="mt-2 text-xs text-gray-500">
            This name appears across your workflows, analytics dashboards, and automation logs.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Account Owner
          </label>
          <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900">
            {clerkName || '—'}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
            Contact Email
          </label>
          <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900">
            {clerkEmail || '—'}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          {message && <p className="text-sm text-emerald-600">{message}</p>}
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-700/60"
        >
          {isSaving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
