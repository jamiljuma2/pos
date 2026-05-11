"use client";

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', sku: '', price: '', stock: '0', categoryId: '' });
  const [categoryName, setCategoryName] = useState('');

  async function load() {
    const [productResponse, categoryResponse] = await Promise.all([
      apiFetch<{ products: any[] }>('/products?limit=100'),
      apiFetch<{ categories: any[] }>('/products/categories')
    ]);
    setProducts(productResponse.products);
    setCategories(categoryResponse.categories);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await apiFetch('/products', {
      method: 'POST',
      body: {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
        categoryId: form.categoryId || undefined
      }
    });
    setForm({ name: '', sku: '', price: '', stock: '0', categoryId: '' });
    await load();
  }

  async function createCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!categoryName.trim()) return;
    await apiFetch('/products/categories', {
      method: 'POST',
      body: { name: categoryName }
    });
    setCategoryName('');
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted">Catalog</p>
        <h1 className="font-display text-4xl font-bold tracking-tight">Products</h1>
      </div>
      <form onSubmit={createProduct} className="glass grid gap-3 rounded-[2rem] border border-line p-5 md:grid-cols-5">
        <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Name" className="rounded-2xl border border-line bg-panel px-4 py-3" />
        <input value={form.sku} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} placeholder="SKU" className="rounded-2xl border border-line bg-panel px-4 py-3" />
        <input value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} placeholder="Price" className="rounded-2xl border border-line bg-panel px-4 py-3" />
        <input value={form.stock} onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value }))} placeholder="Stock" className="rounded-2xl border border-line bg-panel px-4 py-3" />
        <select value={form.categoryId} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))} className="rounded-2xl border border-line bg-panel px-4 py-3">
          <option value="">Category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        <button type="submit" className="rounded-2xl bg-accent px-4 py-3 font-semibold text-accent-foreground md:col-span-5">Save product</button>
      </form>
      <form onSubmit={createCategory} className="glass flex gap-3 rounded-[2rem] border border-line p-5">
        <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="New category name" className="flex-1 rounded-2xl border border-line bg-panel px-4 py-3" />
        <button type="submit" className="rounded-2xl bg-accent px-5 py-3 font-semibold text-accent-foreground">Add category</button>
      </form>
      <div className="glass overflow-hidden rounded-[2rem] border border-line">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead className="bg-slate-50/80 text-muted dark:bg-slate-900/40">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-panel">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-4 py-3 font-medium">{product.name}</td>
                <td className="px-4 py-3 text-muted">{product.sku}</td>
                <td className="px-4 py-3 text-muted">{product.category?.name ?? 'Unassigned'}</td>
                <td className="px-4 py-3">{product.stock}</td>
                <td className="px-4 py-3">KES {Number(product.price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
