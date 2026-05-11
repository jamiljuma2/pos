"use client";

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';
import { MetricCard } from '../../../components/metric-card';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const revenueSeries = data?.dailyRevenue ?? [];
  const maxRevenue = Math.max(1, ...revenueSeries.map((entry: any) => Number(entry.revenue) || 0));

  useEffect(() => {
    void apiFetch('/reports/dashboard').then(setData).catch(() => setData(null));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted">Overview</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">Business dashboard</h1>
        </div>
        <div className="rounded-full border border-line bg-panel px-4 py-2 text-sm font-medium text-muted">Live tenant-scoped reporting</div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Revenue" value={`KES ${Number(data?.summary?.revenue ?? 0).toFixed(2)}`} delta="30 days" hint="Based on completed transactions" />
        <MetricCard label="Transactions" value={`${data?.summary?.transactionCount ?? 0}`} delta="Today" hint="All sales in this business" />
        <MetricCard label="Low stock" value={`${data?.summary?.lowStockCount ?? 0}`} delta="Alerts" hint="Products at or below threshold" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="glass rounded-[2rem] border border-line p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold">Revenue trend</h2>
            <p className="text-sm text-muted">Last 30 days</p>
          </div>
          <div className="mt-6 flex h-64 items-end gap-3">
            {revenueSeries.map((point: any) => {
              const height = Math.max(((Number(point.revenue) || 0) / maxRevenue) * 100, 6);
              return (
                <div key={point.day} className="flex flex-1 flex-col items-center gap-2">
                  <div className="w-full rounded-t-2xl bg-accent/90" style={{ height: `${height}%` }} />
                  <span className="text-[10px] text-muted">{point.day.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </section>
        <section className="glass rounded-[2rem] border border-line p-5 shadow-sm">
          <h2 className="font-display text-2xl font-bold">Top products</h2>
          <div className="mt-4 space-y-3">
            {(data?.topProducts ?? []).map((product: any) => (
              <div key={product.productId ?? product.productName} className="rounded-2xl border border-line bg-panel p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold">{product.productName}</p>
                    <p className="text-sm text-muted">{product.quantity} units sold</p>
                  </div>
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(product.quantity * 8, 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="glass rounded-[2rem] border border-line p-5 shadow-sm">
        <h2 className="font-display text-2xl font-bold">Recent activity</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(data?.recentTransactions ?? []).map((transaction: any) => (
            <div key={transaction.id} className="rounded-2xl border border-line bg-panel p-4">
              <p className="text-sm text-muted">{transaction.receiptNumber}</p>
              <p className="mt-2 font-semibold">KES {Number(transaction.total).toFixed(2)}</p>
              <p className="text-sm text-muted">{transaction.cashier}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
