import Link from 'next/link';

const highlights = [
  'Multi-tenant businesses with isolated data',
  'Fast cashier screen with keyboard-first checkout',
  'Lipana STK Push and webhook-driven payment sync',
  'Inventory, reports, and audit logs built in'
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-10 lg:px-10">
        <div className="grid w-full gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-8">
            <div className="inline-flex items-center rounded-full border border-line bg-panel/80 px-4 py-2 text-sm font-medium text-muted shadow-sm">
              Scalable POS SaaS for modern retail teams
            </div>
            <div className="space-y-5">
              <h1 className="font-display text-5xl font-bold tracking-tight text-text md:text-7xl">
                Run every business from one secure POS platform.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted md:text-xl">
                PulsePOS keeps sales, inventory, payments, and staff access scoped to each business while giving owners a single view across the platform.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link href="/login" className="rounded-full bg-accent px-6 py-3 font-semibold text-accent-foreground shadow-glow transition hover:scale-[1.01]">
                Sign in
              </Link>
              <Link href="/register" className="rounded-full border border-line bg-panel px-6 py-3 font-semibold text-text transition hover:bg-slate-50 dark:hover:bg-slate-900">
                Create business
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {highlights.map((item) => (
                <div key={item} className="glass rounded-2xl p-4 text-sm font-medium text-text shadow-sm">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="glass relative overflow-hidden rounded-[2rem] border border-line p-6 shadow-2xl shadow-teal-950/10">
            <div className="absolute inset-0 bg-grid bg-[size:28px_28px] opacity-60" />
            <div className="absolute inset-0 bg-aurora opacity-90" />
            <div className="relative space-y-5 rounded-[1.5rem] border border-white/40 bg-white/70 p-6 backdrop-blur dark:bg-slate-950/70">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">Today&apos;s revenue</p>
                  <p className="font-display text-3xl font-bold">KES 48,250</p>
                </div>
                <div className="rounded-2xl bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  +18.4%
                </div>
              </div>
              <div className="space-y-3 rounded-2xl border border-line bg-panel p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Pending payments</span>
                  <span className="font-semibold">8</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-3 w-3/4 rounded-full bg-accent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-line bg-panel p-4">
                  <p className="text-muted">Products sold</p>
                  <p className="mt-2 text-2xl font-bold">624</p>
                </div>
                <div className="rounded-2xl border border-line bg-panel p-4">
                  <p className="text-muted">Low stock</p>
                  <p className="mt-2 text-2xl font-bold">14</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
