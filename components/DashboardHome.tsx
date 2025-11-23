// components/DashboardHome.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import type { Route } from "next";
import { useMemo, useState, useEffect } from "react";
import { type PantryItem } from "@/data/pantry-items";
import { getItems, backendItemToFrontend } from "@/lib/api";

type Item = PantryItem;

function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full bg-white shadow-soft border">
      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      {children}
    </span>
  );
}

export default function DashboardHome() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"added" | "expires">("added");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch items from API
  useEffect(() => {
    async function fetchItems() {
      try {
        setLoading(true);
        setError(null);
        const backendItems = await getItems();
        const frontendItems = backendItems.map(backendItemToFrontend);
        setItems(frontendItems);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load items");
        console.error("Error fetching items:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchItems();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter(i => !q || i.name.toLowerCase().includes(q));
    if (sort === "added") return list.sort((a,b) => (a.addedAt > b.addedAt ? -1 : 1));
    return list.sort((a,b) => ((a.expiresInDays ?? 999) - (b.expiresInDays ?? 999)));
  }, [query, sort, items]);

  const expiringSoon = items
    .filter(i => i.status === "expiring")
    .sort((a,b) => (a.expiresInDays ?? 999) - (b.expiresInDays ?? 999))
    .slice(0, 5);

  const recentlyAdded = items
    .slice()
    .sort((a,b) => (a.addedAt > b.addedAt ? -1 : 1))
    .slice(0, 5);

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
          <h3 className="font-semibold mb-2 text-sm sm:text-base">Expiring Soon</h3>
          <ul className="text-slate-700 text-xs sm:text-sm space-y-1">
            {expiringSoon.map(i => (
              <li key={i.id} className="flex items-center justify-between">
                <span className="truncate pr-2">{i.name}</span>
                <span className="text-slate-400 flex-shrink-0">{i.expiresInDays! >= 0 ? `${i.expiresInDays}d` : "expired"}</span>
              </li>
            ))}
            {expiringSoon.length === 0 && <li className="text-slate-400">Nothing expiring soon 🎉</li>}
          </ul>
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
                disabled={loading}
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
                disabled={loading}
              >
                <option value="added">Recently Added</option>
                <option value="expires">Expires (Soonest First)</option>
              </select>
            </div>
          </div>

          {loading && (
            <div className="text-center py-8 text-slate-500">
              <p>Loading pantry items...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-600 mb-2">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-blue-600 hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="divide-y max-h-[40vh] sm:max-h-none overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p>No items found. {query ? "Try a different search." : "Add your first item to get started!"}</p>
                  </div>
                ) : (
                  filtered.map(i => (
                    <div key={i.id} className="py-2 sm:py-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <span
                          className="inline-block w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor:
                              i.status === "fresh" ? "#22c55e" :
                              i.status === "expiring" ? "#fbbf24" : "#ef4444",
                          }}
                        />
                        <span className="font-medium text-sm sm:text-base truncate">{i.name}</span>
                      </div>
                      <span className="text-xs text-slate-500 flex-shrink-0">
                        {i.status === "expired"
                          ? "expired"
                          : typeof i.expiresInDays === "number"
                            ? `${i.expiresInDays}d`
                            : ""}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

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