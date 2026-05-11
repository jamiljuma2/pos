"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { saveSession } from '../../../lib/session';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<{ user: any; tokens: { accessToken: string; refreshToken: string } }>('/auth/login', {
        method: 'POST',
        body: { email, password }
      });
      saveSession(response.tokens, response.user);
      router.replace('/dashboard');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl place-items-center">
      <div className="glass w-full max-w-lg rounded-[2rem] border border-line p-8 shadow-2xl">
        <p className="font-display text-3xl font-bold tracking-tight">Sign in</p>
        <p className="mt-2 text-sm text-muted">Use your business owner or staff account.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="Email" className="w-full rounded-2xl border border-line bg-panel px-4 py-3" />
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Password" className="w-full rounded-2xl border border-line bg-panel px-4 py-3" />
          {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">{error}</div> : null}
          <button type="submit" disabled={loading} className="w-full rounded-2xl bg-accent px-5 py-3 font-semibold text-accent-foreground shadow-glow disabled:opacity-70">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 text-sm text-muted">
          New business? <Link href="/register" className="font-semibold text-accent">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
