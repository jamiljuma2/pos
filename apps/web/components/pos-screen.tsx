"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';
import { getSessionUser } from '../lib/session';

type Product = {
  id: string;
  name: string;
  sku: string;
  barcode?: string | null;
  price: number;
  stock: number;
  category?: { id: string; name: string } | null;
};

type CartItem = Product & { quantity: number; discount: number };

export function PosScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [discountTotal, setDiscountTotal] = useState(0);
  const [taxTotal, setTaxTotal] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void loadProducts();
    searchRef.current?.focus();
  }, []);

  async function loadProducts(query = '') {
    setLoading(true);
    try {
      const response = await apiFetch<{ products: Product[] }>(`/products?limit=100&search=${encodeURIComponent(query)}`);
      setProducts(response.products);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (event.key === 'F2') {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'F9') {
        event.preventDefault();
        void submitSale();
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [cart, customerPhone, notes, discountTotal, taxTotal]);

  const total = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity - item.discount, 0);
    return Math.max(subtotal - discountTotal + taxTotal, 0);
  }, [cart, discountTotal, taxTotal]);

  function addProduct(product: Product) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...current, { ...product, quantity: 1, discount: 0 }];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    setCart((current) =>
      current
        .map((item) => (item.id === productId ? { ...item, quantity } : item))
        .filter((item) => item.quantity > 0)
    );
  }

  async function submitSale() {
    if (cart.length === 0) return;
    setLoading(true);
    setStatus(null);
    try {
      const session = getSessionUser();
      const response = await apiFetch<{ transaction: { receiptNumber: string; total: number } }>('/sales', {
        method: 'POST',
        body: {
          staffId: session?.staffId ?? undefined,
          items: cart.map((item) => ({ productId: item.id, quantity: item.quantity, discount: item.discount })),
          discountTotal,
          taxTotal,
          customerPhone: customerPhone || undefined,
          notes: notes || undefined
        }
      });
      setStatus(`Sale saved. Receipt ${response.transaction.receiptNumber}`);
      setCart([]);
      setCustomerPhone('');
      setNotes('');
      setDiscountTotal(0);
      setTaxTotal(0);
      await loadProducts(search);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to save sale');
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = products.filter((product) => {
    const haystack = `${product.name} ${product.sku} ${product.barcode ?? ''}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="glass rounded-[2rem] border border-line p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted">Point of Sale</p>
            <h1 className="font-display text-3xl font-bold tracking-tight">Cashier terminal</h1>
          </div>
          <div className="text-sm text-muted">Keyboard: F2 search, F9 checkout</div>
        </div>
        <div className="mt-5 flex gap-3">
          <input
            ref={searchRef}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              void loadProducts(event.target.value);
            }}
            placeholder="Search product name, SKU, or barcode"
            className="w-full rounded-2xl border border-line bg-panel px-4 py-3 outline-none ring-0 placeholder:text-slate-400 focus:border-accent"
          />
          <button
            type="button"
            onClick={() => void loadProducts(search)}
            className="rounded-2xl bg-accent px-5 py-3 font-semibold text-accent-foreground"
          >
            {loading ? 'Loading...' : 'Search'}
          </button>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => addProduct(product)}
              className="rounded-3xl border border-line bg-panel p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-sm text-muted">{product.sku}</p>
                </div>
                <span className="rounded-full bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300">Stock {product.stock}</span>
              </div>
              <p className="mt-4 font-display text-2xl font-bold">KES {product.price.toFixed(2)}</p>
            </button>
          ))}
        </div>
      </section>
      <aside className="glass rounded-[2rem] border border-line p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted">Current cart</p>
            <h2 className="font-display text-2xl font-bold">{cart.length} items</h2>
          </div>
          <div className="rounded-2xl bg-accent/10 px-4 py-2 text-right">
            <p className="text-xs uppercase tracking-wide text-muted">Total</p>
            <p className="text-xl font-bold">KES {total.toFixed(2)}</p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {cart.length === 0 ? <div className="rounded-3xl border border-dashed border-line p-6 text-center text-sm text-muted">Cart is empty</div> : null}
          {cart.map((item) => (
            <div key={item.id} className="rounded-3xl border border-line bg-panel p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-muted">KES {item.price.toFixed(2)}</p>
                </div>
                <button type="button" onClick={() => setCart((current) => current.filter((entry) => entry.id !== item.id))} className="text-sm font-semibold text-rose-600">
                  Remove
                </button>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button type="button" onClick={() => updateQuantity(item.id, item.quantity - 1)} className="h-10 w-10 rounded-xl border border-line">
                  -
                </button>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(event) => updateQuantity(item.id, Number(event.target.value))}
                  className="w-20 rounded-xl border border-line bg-panel px-3 py-2 text-center"
                />
                <button type="button" onClick={() => updateQuantity(item.id, item.quantity + 1)} className="h-10 w-10 rounded-xl border border-line">
                  +
                </button>
                <div className="ml-auto text-right">
                  <p className="text-xs text-muted">Line total</p>
                  <p className="font-semibold">KES {(item.price * item.quantity - item.discount).toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3">
          <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Customer phone" className="rounded-2xl border border-line bg-panel px-4 py-3" />
          <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Receipt notes" className="rounded-2xl border border-line bg-panel px-4 py-3" />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={discountTotal} onChange={(event) => setDiscountTotal(Number(event.target.value))} placeholder="Discount" className="rounded-2xl border border-line bg-panel px-4 py-3" />
            <input type="number" value={taxTotal} onChange={(event) => setTaxTotal(Number(event.target.value))} placeholder="Tax" className="rounded-2xl border border-line bg-panel px-4 py-3" />
          </div>
        </div>
        <button type="button" onClick={() => void submitSale()} className="mt-5 w-full rounded-2xl bg-accent px-5 py-4 text-lg font-semibold text-accent-foreground shadow-glow">
          Complete sale
        </button>
        {status ? <p className="mt-4 rounded-2xl border border-line bg-panel p-4 text-sm">{status}</p> : null}
      </aside>
    </div>
  );
}
