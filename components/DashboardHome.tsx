// components/DashboardHome.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import { useMemo, useState, useEffect } from "react";

type Item = {
  id: number;
  name: string;
  quantity: number;
  expiration_date?: string;
  created_at?: string;
};

function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full bg-white shadow-soft border">
      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      {children}
    </span>
  );
}

export default function DashboardHome() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"added" | "expires">("added");

  useEffect(() => {
    fetch("http://localhost:8000/items")
      .then(res => res.json())
      .then(data => {
        setItems(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch items:", err);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(i => !q || i.name.toLowerCase().includes(q));
  }, [query, items]);

  const recentlyAdded = useMemo(() => {
    return items.slice().sort((a,b) => 
      (b.created_at || "").localeCompare(a.created_at || "")
    ).slice(0, 5);
  }, [items]);

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 grid gap-4 sm:gap-8">
      <header className="text-center grid gap-2 sm:gap-3">
        <div className="mx-auto">
          <Image src="/Green_Basket_Icon.png" width={48} height={48} alt="SmartPantry" className="w-12 h-12 sm:w-14 sm:h-14" />
        </div>
        <h1 className="text-xl sm:text-3xl font-semibold">SmartPantry</h1>
        <p className="text-xs sm:text-base text-slate-600 px-2">Welcome back! Here&apos;s a quick look at your pantry.</p>
      </header>

      <section className="grid gap-3 sm:gap-4 md:grid-cols-3">
        <div className="card p-4 sm:p-6">
          <h3 className="font-semibold mb-2 text-sm sm:text-base">Total Items</h3>
          <p className="text-3xl font-bold text-green-600">{items.length}</p>
        </div>

        <div className="card p-4 sm:p-6">
          <h3 className="font-semibold mb-2 text-sm sm:text-base">Recently Added</h3>
          <ul className="text-slate-700 text-xs sm:text-sm space-y-1">
            {recentlyAdded.map(i => (
              <li key={i.id} className="flex items-center justify-between">
                <span className="truncate pr-2">{i.name}</span>
                <span className="text-slate-400 flex-shrink-0 text-xs">{new Date(i.addedAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-4 sm:p-6">
          <h3 className="font-semibold mb-2 text-sm sm:text-base">Waste Saved</h3>
          <p className="text-slate-600 text-xs sm:text-sm">TBD — we&apos;ll wire this to your tracking in Sprint 2.</p>
        </div>
      </section>

      <section className="card p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-2">
            <div className="flex items-center gap-2 flex-1">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search"
                className="border rounded-full px-3 py-1.5 text-base sm:text-sm flex-1 min-w-0"
              />
              <div className="hidden md:flex items-center gap-2">
                <Pill color="#22c55e">Fresh</Pill>
                <Pill color="#fbbf24">Expiring Soon</Pill>
                <Pill color="#ef4444">Expired</Pill>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <label className="text-xs sm:text-sm text-slate-600">Sort</label>
              <select
                value={sort}
                onChange={e => setSort(e.target.value as "added" | "expires")}
                className="border rounded-lg px-2 py-1 text-base sm:text-sm bg-white"
              >
                <option value="added">Recently Added</option>
                <option value="expires">Expires (Soonest First)</option>
              </select>
            </div>
          </div>

          <div className="divide-y max-h-[40vh] sm:max-h-none overflow-y-auto">
            {filtered.map(i => (
              <div key={i.id} className="py-2 sm:py-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <span className="font-medium text-sm sm:text-base truncate">{i.name}</span>
                </div>
                <span className="text-xs text-slate-500 flex-shrink-0">
                  Qty: {i.quantity}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0">
            <Link href={"/pantry" as Route} className="text-xs sm:text-sm text-slate-600 hover:underline text-center sm:text-left">
              View full pantry →
            </Link>
            <Link href={"/pantry" as Route} className="px-4 py-2 rounded-full bg-green-600 text-white text-xs sm:text-sm text-center">
              Add Item to Pantry
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}