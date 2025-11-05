// components/DashboardHome.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";

type SortKey = "added" | "expires";

type Item = {
  id: string;
  name: string;
  status: "fresh" | "expiring" | "expired";
  addedAt: string; // ISO date
  expiresInDays?: number;
};

const DEMO_ITEMS: Item[] = [
  { id: "1", name: "Chicken Breast", status: "fresh", addedAt: "2025-10-10", expiresInDays: 6 },
  { id: "2", name: "Strawberries",   status: "expiring", addedAt: "2025-10-13", expiresInDays: 1 },
  { id: "3", name: "Canned Beans",   status: "fresh", addedAt: "2025-10-01", expiresInDays: 365 },
  { id: "4", name: "Ground Beef",    status: "expiring", addedAt: "2025-10-14", expiresInDays: 2 },
  { id: "5", name: "Avocados",       status: "expired", addedAt: "2025-10-05", expiresInDays: -1 },
  { id: "6", name: "Chicken Broth",  status: "fresh", addedAt: "2025-10-12", expiresInDays: 120 },
  { id: "7", name: "Bread",          status: "expiring", addedAt: "2025-10-14", expiresInDays: 1 },
  { id: "8", name: "Bananas",        status: "expiring", addedAt: "2025-10-13", expiresInDays: 2 },
];

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
  const [sort, setSort] = useState<SortKey>("added");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = DEMO_ITEMS.filter((i) => !q || i.name.toLowerCase().includes(q));
    if (sort === "added") return list.sort((a, b) => (a.addedAt > b.addedAt ? -1 : 1));
    return list.sort((a, b) => ( (a.expiresInDays ?? 0) - (b.expiresInDays ?? 0) ));
  }, [query, sort]);

  const expiringSoon = DEMO_ITEMS
    .filter((i) => i.status === "expiring")
    .sort((a, b) => (a.expiresInDays ?? 999) - (b.expiresInDays ?? 999))
    .slice(0, 5);

  const recentlyAdded = DEMO_ITEMS
    .slice()
    .sort((a, b) => (a.addedAt > b.addedAt ? -1 : 1))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 grid gap-8">
      <header className="text-center grid gap-3">
        <div className="mx-auto relative h-14 w-14">
          <Image
            src="/Green_Basket_Icon.png"
            alt="SmartPantry"
            fill
            className="object-contain"
            sizes="(max-width: 640px) 56px, 56px"
            priority
          />
        </div>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold">SmartPantry</h1>
        <p className="text-slate-600 text-sm sm:text-base">
          Welcome back! Here&rsquo;s a quick look at your pantry.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <h3 className="font-semibold mb-2">Expiring Soon</h3>
          <ul className="text-slate-700 text-sm space-y-1">
            {expiringSoon.map((i) => (
              <li key={i.id} className="flex items-center justify-between">
                <span>{i.name}</span>
                <span className="text-slate-400">{i.expiresInDays! >= 0 ? `${i.expiresInDays}d` : "expired"}</span>
              </li>
            ))}
            {expiringSoon.length === 0 && <li className="text-slate-400">Nothing expiring soon 🎉</li>}
          </ul>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-2">Recently Added</h3>
          <ul className="text-slate-700 text-sm space-y-1">
            {recentlyAdded.map((i) => (
              <li key={i.id} className="flex items-center justify-between">
                <span>{i.name}</span>
                <span className="text-slate-400">{new Date(i.addedAt).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-2">Waste Saved</h3>
          <p className="text-slate-600 text-sm">TBD &mdash; we&rsquo;ll wire this to your tracking in Sprint 2.</p>
        </div>
      </section>

      <section className="card">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="w-full md:w-64 border rounded-full px-3 py-1.5 text-sm"
              />
              <div className="hidden md:flex items-center gap-2">
                <Pill color="#22c55e">Fresh</Pill>
                <Pill color="#fbbf24">Expiring Soon</Pill>
                <Pill color="#ef4444">Expired</Pill>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600">Sort</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="border rounded-lg px-2 py-1 text-sm bg-white"
              >
                <option value="added">Recently Added</option>
                <option value="expires">Expires (Soonest First)</option>
              </select>
            </div>
          </div>

          <div className="divide-y">
            {filtered.map((i) => (
              <div key={i.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        i.status === "fresh" ? "#22c55e" :
                        i.status === "expiring" ? "#fbbf24" : "#ef4444",
                    }}
                  />
                  <span className="font-medium">{i.name}</span>
                </div>
                <span className="text-xs text-slate-500">
                  {i.status === "expired"
                    ? "expired"
                    : typeof i.expiresInDays === "number"
                      ? `${i.expiresInDays}d`
                      : ""}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center justify-between">
            <Link href="/pantry" className="text-sm text-slate-600 hover:underline">
              View full pantry →
            </Link>
            <Link href="/pantry" className="px-4 py-2 rounded-full bg-green-600 text-white text-sm">
              Add Item to Pantry
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}