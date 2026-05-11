"use client";

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

export default function ReportsPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    void apiFetch('/reports/dashboard').then(setData).catch(() => setData(null));
  }, []);

  async function downloadCsv() {
    const token = localStorage.getItem('pulsepos.accessToken');
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'}/reports/sales.csv`, {
      headers: { Authorization: `Bearer ${token ?? ''}` }
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'sales-report.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Reporting</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">Sales analytics</h1>
        </div>
        <button type="button" onClick={() => void downloadCsv()} className="rounded-full bg-accent px-5 py-3 font-semibold text-accent-foreground">
          Export CSV
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass rounded-[2rem] border border-line p-5"><p className="text-sm text-muted">Revenue</p><p className="mt-2 font-display text-3xl font-bold">KES {Number(data?.summary?.revenue ?? 0).toFixed(2)}</p></div>
        <div className="glass rounded-[2rem] border border-line p-5"><p className="text-sm text-muted">Transactions</p><p className="mt-2 font-display text-3xl font-bold">{data?.summary?.transactionCount ?? 0}</p></div>
        <div className="glass rounded-[2rem] border border-line p-5"><p className="text-sm text-muted">Low stock</p><p className="mt-2 font-display text-3xl font-bold">{data?.summary?.lowStockCount ?? 0}</p></div>
      </div>
      <div className="glass rounded-[2rem] border border-line p-5">
        <h2 className="font-display text-2xl font-bold">Daily revenue</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(data?.dailyRevenue ?? []).map((point: any) => (
            <div key={point.day} className="rounded-2xl border border-line bg-panel p-4">
              <p className="text-sm text-muted">{point.day}</p>
              <p className="mt-2 text-2xl font-bold">KES {Number(point.revenue).toFixed(2)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
