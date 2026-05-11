"use client";

import { useEffect, useState } from 'react';
import { apiFetch } from '../../../lib/api';

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);

  async function load() {
    const response = await apiFetch<{ products: any[] }>('/products/alerts/low-stock');
    setProducts(response.products);
  }

  useEffect(() => {
    void load();
  }, []);

  async function adjustStock(productId: string, stock: number) {
    await apiFetch(`/products/${productId}/stock`, {
      method: 'PATCH',
      body: { stock, mode: 'set' }
    });
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted">Inventory</p>
        <h1 className="font-display text-4xl font-bold tracking-tight">Low stock alerts</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <div key={product.id} className="glass rounded-[2rem] border border-line p-5">
            <p className="text-sm text-muted">{product.sku}</p>
            <h2 className="mt-1 font-display text-2xl font-bold">{product.name}</h2>
            <p className="mt-3 text-sm text-muted">Threshold {product.lowStockThreshold}</p>
            <div className="mt-4 flex items-end justify-between gap-3">
              <p className="text-3xl font-bold">{product.stock}</p>
              <button type="button" onClick={() => void adjustStock(product.id, product.lowStockThreshold + 20)} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground">
                Refill
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
