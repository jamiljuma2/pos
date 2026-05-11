"use client";

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

export default function SettingsPage() {
  const [business, setBusiness] = useState<any>(null);
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', displayName: '' });

  async function loadBusiness() {
    const response = await apiFetch<{ business: any }>('/business/current');
    setBusiness(response.business);
  }

  useEffect(() => {
    void loadBusiness();
  }, []);

  async function saveBusiness(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await apiFetch<{ business: any }>('/business/current', {
      method: 'PATCH',
      body: {
        name: business.name,
        location: business.location,
        currency: business.currency,
        phone: business.phone
      }
    });
    setBusiness(response.business);
  }

  async function createStaff(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await apiFetch('/auth/staff', {
      method: 'POST',
      body: {
        ...staffForm,
        permissions: ['SELL']
      }
    });
    setStaffForm({ name: '', email: '', password: '', displayName: '' });
  }

  if (!business) {
    return <div className="rounded-3xl border border-line bg-panel p-6">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted">Settings</p>
        <h1 className="font-display text-4xl font-bold tracking-tight">Business profile</h1>
      </div>
      <form onSubmit={saveBusiness} className="glass grid gap-3 rounded-[2rem] border border-line p-5 md:grid-cols-2">
        <input value={business.name ?? ''} onChange={(event) => setBusiness((current: any) => ({ ...current, name: event.target.value }))} placeholder="Business name" className="rounded-2xl border border-line bg-panel px-4 py-3" />
        <input value={business.location ?? ''} onChange={(event) => setBusiness((current: any) => ({ ...current, location: event.target.value }))} placeholder="Location" className="rounded-2xl border border-line bg-panel px-4 py-3" />
        <input value={business.currency ?? 'KES'} onChange={(event) => setBusiness((current: any) => ({ ...current, currency: event.target.value.toUpperCase() }))} placeholder="Currency" className="rounded-2xl border border-line bg-panel px-4 py-3" />
        <input value={business.phone ?? ''} onChange={(event) => setBusiness((current: any) => ({ ...current, phone: event.target.value }))} placeholder="Phone" className="rounded-2xl border border-line bg-panel px-4 py-3" />
        <button type="submit" className="rounded-2xl bg-accent px-4 py-3 font-semibold text-accent-foreground md:col-span-2">Save business</button>
      </form>
      <form onSubmit={createStaff} className="glass grid gap-3 rounded-[2rem] border border-line p-5 md:grid-cols-4">
        <input value={staffForm.name} onChange={(event) => setStaffForm((current) => ({ ...current, name: event.target.value }))} placeholder="Staff name" className="rounded-2xl border border-line bg-panel px-4 py-3" />
        <input value={staffForm.email} onChange={(event) => setStaffForm((current) => ({ ...current, email: event.target.value }))} placeholder="Staff email" className="rounded-2xl border border-line bg-panel px-4 py-3" />
        <input value={staffForm.password} onChange={(event) => setStaffForm((current) => ({ ...current, password: event.target.value }))} placeholder="Temp password" className="rounded-2xl border border-line bg-panel px-4 py-3" />
        <input value={staffForm.displayName} onChange={(event) => setStaffForm((current) => ({ ...current, displayName: event.target.value }))} placeholder="Display name" className="rounded-2xl border border-line bg-panel px-4 py-3" />
        <button type="submit" className="rounded-2xl bg-accent px-4 py-3 font-semibold text-accent-foreground md:col-span-4">Create staff account</button>
      </form>
    </div>
  );
}
