"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { saveSession } from '../../../lib/session';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    ownerName: '',
    email: '',
    password: '',
    businessName: '',
    location: '',
    currency: 'KES',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<{ user: any; tokens: { accessToken: string; refreshToken: string } }>('/auth/register', {
        method: 'POST',
        body: {
          ownerName: form.ownerName,
          email: form.email,
          password: form.password,
          business: {
            name: form.businessName,
            location: form.location,
            currency: form.currency,
            phone: form.phone
          }
        }
      });
      saveSession(response.tokens, response.user);
      router.replace('/dashboard');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create account');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl place-items-center">
      <div className="glass w-full max-w-2xl rounded-[2rem] border border-line p-8 shadow-2xl">
        <p className="font-display text-3xl font-bold tracking-tight">Create business</p>
        <p className="mt-2 text-sm text-muted">Set up the first owner account and business profile.</p>
        <form onSubmit={handleSubmit} className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            ['ownerName', 'Owner name'],
            ['email', 'Email'],
            ['password', 'Password'],
            ['businessName', 'Business name'],
            ['location', 'Location'],
            ['phone', 'Phone']
          ].map(([key, placeholder]) => (
            <input
              key={key}
              value={form[key as keyof typeof form]}
              onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
              type={key === 'password' ? 'password' : key === 'email' ? 'email' : 'text'}
              placeholder={placeholder}
              className="rounded-2xl border border-line bg-panel px-4 py-3"
            />
          ))}
          <input
            value={form.currency}
            onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
            placeholder="Currency"
            className="rounded-2xl border border-line bg-panel px-4 py-3"
          />
          <div className="md:col-span-2">
            {error ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</div> : null}
            <button type="submit" disabled={loading} className="w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-accent-foreground shadow-glow disabled:opacity-70">
              {loading ? 'Creating business...' : 'Create account'}
            </button>
          </div>
        </form>
        <p className="mt-6 text-sm text-muted">
          Already have an account? <Link href="/login" className="font-semibold text-accent">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
