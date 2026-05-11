"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { clearSession, getSessionUser } from '../lib/session';
import { ThemeToggle } from './theme-toggle';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/pos', label: 'POS' },
  { href: '/products', label: 'Products' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/reports', label: 'Reports' },
  { href: '/settings', label: 'Settings' }
];

export function DashboardShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const user = useMemo(() => getSessionUser(), [ready]);

  useEffect(() => {
    if (!getSessionUser()) {
      router.replace('/login');
      return;
    }

    setReady(true);
  }, [router]);

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-muted">Loading workspace...</div>;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(255,255,255,0.4))] dark:bg-none">
      <header className="sticky top-0 z-30 border-b border-line bg-white/75 backdrop-blur dark:bg-slate-950/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
          <div>
            <p className="font-display text-xl font-bold tracking-tight">PulsePOS</p>
            <p className="text-sm text-muted">{user?.businessId ? `Business ${user.businessId.slice(0, 8)}` : 'Platform overview'}</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => {
                clearSession();
                router.replace('/login');
              }}
              className="rounded-full border border-line bg-panel px-4 py-2 text-sm font-semibold text-text transition hover:bg-slate-50 dark:hover:bg-slate-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-[240px_1fr] lg:px-10">
        <aside className="glass h-fit rounded-3xl border border-line p-4 shadow-sm">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-2xl px-4 py-3 text-sm font-semibold transition ${active ? 'bg-accent text-accent-foreground' : 'text-text hover:bg-slate-100 dark:hover:bg-slate-900'}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="space-y-6">{children}</main>
      </div>
    </div>
  );
}
