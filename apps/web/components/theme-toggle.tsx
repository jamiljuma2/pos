"use client";

import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const value = localStorage.getItem('pulsepos.theme');
    const nextDark = value ? value === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDark(nextDark);
    document.documentElement.classList.toggle('dark', nextDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('pulsepos.theme', next ? 'dark' : 'light');
  };

  return (
    <button type="button" onClick={toggle} className="rounded-full border border-line bg-panel px-4 py-2 text-sm font-semibold text-text transition hover:bg-slate-50 dark:hover:bg-slate-900">
      {dark ? 'Light mode' : 'Dark mode'}
    </button>
  );
}
