"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { fetchNearbyStores, type NearbyStore } from "@/lib/nearby-stores";
import { geocodeSearch } from "@/lib/geocode";
import { API_BASE_URL } from "@/lib/config";

const StoreMap = dynamic(() => import("@/components/StoreMap"), { ssr: false });

/** One price result from /api/price-compare */
interface PriceResultItem {
  source: string;
  store: string;
  name: string;
  price: number;
  unit_price?: number | null;
  size?: string | null;
  url?: string | null;
  retrieved_at: string;
}

interface PriceCompareResponse {
  query: string;
  zip: string;
  cheapest: PriceResultItem | null;
  results: PriceResultItem[];
  source_status: { apify_enabled: boolean; reason: string; used_cache: boolean };
}

const STORAGE_KEY = "smart-pantry-shopping-list";
const CHECKED_STORES_KEY = "smart-pantry-checked-stores";

function loadCheckedStoreIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(CHECKED_STORES_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveCheckedStoreIds(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHECKED_STORES_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

export interface ShoppingListItem {
  id: string;
  name: string;
  checked: boolean;
}

function loadList(): ShoppingListItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((x: { id?: string; name?: string; checked?: boolean }) => ({
          id: typeof x.id === "string" ? x.id : crypto.randomUUID(),
          name: typeof x.name === "string" ? x.name : "",
          checked: Boolean(x.checked),
        }))
      : [];
  } catch {
    return [];
  }
}

function saveList(items: ShoppingListItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export default function ShoppingPageContent() {
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  /** Map center and origin for store search (user location or geocoded search) */
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyStores, setNearbyStores] = useState<NearbyStore[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [storesError, setStoresError] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [checkedStoreIds, setCheckedStoreIds] = useState<Set<string>>(new Set());
  const [priceQuery, setPriceQuery] = useState("");
  const [priceZip, setPriceZip] = useState("");
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceResult, setPriceResult] = useState<PriceCompareResponse | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);

  const DEFAULT_MAP_CENTER = { lat: 40.7488, lng: -73.9857 };

  const load = useCallback(() => setItems(loadList()), []);
  const loadChecked = useCallback(() => setCheckedStoreIds(loadCheckedStoreIds()), []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    loadChecked();
  }, [loadChecked]);

  useEffect(() => {
    saveList(items);
  }, [items]);

  useEffect(() => {
    if (!mapCenter) {
      setNearbyStores([]);
      setStoresError(null);
      return;
    }
    let cancelled = false;
    setStoresLoading(true);
    setStoresError(null);
    fetchNearbyStores(mapCenter.lat, mapCenter.lng)
      .then((list) => {
        if (!cancelled) {
          setNearbyStores(list);
          setStoresError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setStoresError("Could not load nearby stores.");
      })
      .finally(() => {
        if (!cancelled) setStoresLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mapCenter]);

  const toggleStoreChecked = (storeId: string) => {
    setCheckedStoreIds((prev) => {
      const next = new Set(prev);
      if (next.has(storeId)) next.delete(storeId);
      else next.add(storeId);
      saveCheckedStoreIds(next);
      return next;
    });
  };

  const addItem = () => {
    const name = newItemName.trim();
    if (!name) return;
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name, checked: false },
    ]);
    setNewItemName("");
  };

  const toggleChecked = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const useMyLocation = () => {
    setLocationError(null);
    setSearchError(null);
    setLocationLoading(true);
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setLocationLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const coords = { lat: latitude, lng: longitude };
        setUserLocation(coords);
        setMapCenter(coords);
        setLocationLoading(false);
      },
      () => {
        setLocationError("Could not get your location. Check permissions or try Search Stores.");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const searchStores = async () => {
    const query = searchQuery.trim() || "grocery stores";
    setSearchError(null);
    setSearchLoading(true);
    try {
      const result = await geocodeSearch(query);
      if (result) {
        setMapCenter({ lat: result.lat, lng: result.lng });
        setSearchQuery(result.displayName.split(",").slice(0, 2).join(",").trim());
      } else {
        setSearchError("No results for that search. Try a city name or address.");
      }
    } catch {
      setSearchError("Search failed. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  };

  const uncheckedItems = items.filter((i) => !i.checked);

  const fetchPriceCompare = async () => {
    const q = priceQuery.trim();
    const z = priceZip.trim();
    if (!q || !z) {
      setPriceError("Enter an item and ZIP code.");
      return;
    }
    setPriceError(null);
    setPriceResult(null);
    setPriceLoading(true);
    try {
      const url = `${API_BASE_URL}/api/price-compare?query=${encodeURIComponent(q)}&zip=${encodeURIComponent(z)}`;
      const res = await fetch(url);
      let data: PriceCompareResponse;
      try {
        data = (await res.json()) as PriceCompareResponse;
      } catch {
        setPriceError(`API returned ${res.status}. Ensure the backend is running at ${API_BASE_URL}.`);
        setPriceLoading(false);
        return;
      }
      setPriceResult(data);
      if (!res.ok) setPriceError(data?.source_status?.reason || "Request failed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not fetch prices";
      setPriceError(
        msg === "Failed to fetch"
          ? `Cannot reach the API. Is the backend running? (Expected: ${API_BASE_URL})`
          : msg
      );
      setPriceResult(null);
    } finally {
      setPriceLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-4xl font-bold text-slate-800 mb-1">Shopping List</h1>
        <p className="text-slate-600">Find stores and manage what you need to buy.</p>
      </header>

      {/* 1. Find Nearby Stores – main feature first */}
      <section className="mb-6">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">Find Nearby Stores</h2>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locationLoading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {locationLoading ? "Getting location…" : "Use My Location"}
              </button>
              <div className="flex gap-2 flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchStores()}
                  placeholder="City or address"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => searchStores()}
                  disabled={searchLoading}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  {searchLoading ? "Searching…" : "Search Stores"}
                </button>
              </div>
            </div>
            {locationError && (
              <p className="mt-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                {locationError}
              </p>
            )}
            {searchError && (
              <p className="mt-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                {searchError}
              </p>
            )}
          </div>
          <div className="grid lg:grid-cols-[1fr,300px] gap-0">
            <div className="relative min-h-[360px] bg-slate-100">
              <StoreMap
                center={mapCenter ?? DEFAULT_MAP_CENTER}
                userLocation={userLocation}
                stores={nearbyStores}
                className="w-full h-full min-h-[360px] rounded-none"
              />
              <div className="absolute bottom-2 left-2 flex gap-2 text-xs text-slate-600 bg-white/90 backdrop-blur px-2 py-1.5 rounded-lg shadow">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#16a34a] border border-white shadow" /> Store
                </span>
                <span className="flex items-center gap-1.5">
                  <img src="https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png" alt="" className="w-3 h-5 object-contain" /> You
                </span>
              </div>
            </div>
            <div className="border-l border-slate-100 flex flex-col max-h-[400px]">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                <h3 className="font-semibold text-slate-800">Stores in your area</h3>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                {!mapCenter && (
                  <p className="text-sm text-slate-500 py-4 text-center">
                    Use &quot;Use My Location&quot; or search for a city/address to find stores on the map.
                  </p>
                )}
                {mapCenter && storesLoading && (
                  <p className="text-sm text-slate-500 py-4 text-center">Loading stores…</p>
                )}
                {mapCenter && storesError && (
                  <p className="text-sm text-amber-700 py-2">{storesError}</p>
                )}
                {mapCenter && !storesLoading && !storesError && nearbyStores.length === 0 && (
                  <p className="text-sm text-slate-500 py-4 text-center">
                    No grocery stores found within 5 km. Try another area.
                  </p>
                )}
                {mapCenter && !storesLoading && nearbyStores.length > 0 && (
                  <ul className="space-y-1">
                    {nearbyStores.map((store) => {
                      const checked = checkedStoreIds.has(store.id);
                      return (
                        <li
                          key={store.id}
                          className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 group"
                        >
                          <button
                            type="button"
                            onClick={() => toggleStoreChecked(store.id)}
                            className="flex-shrink-0 w-5 h-5 rounded border-2 border-slate-300 flex items-center justify-center hover:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                            aria-label={checked ? "Mark unvisited" : "Mark visited"}
                          >
                            {checked && <span className="text-green-600 font-bold text-sm">✓</span>}
                          </button>
                          <span
                            className={`flex-1 text-sm text-slate-800 truncate ${
                              checked ? "line-through text-slate-500" : ""
                            }`}
                            title={store.name}
                          >
                            {store.name}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Compare prices (Apify) */}
      <section className="mb-6 bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-1">Compare prices</h2>
        <p className="text-sm text-slate-600 mb-4">
          Search for an item and your ZIP code.
        </p>
        <div className="flex flex-wrap gap-2 items-end mb-4">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs font-medium text-slate-500 mb-1">Item</label>
            <input
              type="text"
              value={priceQuery}
              onChange={(e) => setPriceQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchPriceCompare()}
              placeholder="e.g. milk, bread"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-slate-800"
            />
          </div>
          <div className="w-28">
            <label className="block text-xs font-medium text-slate-500 mb-1">ZIP code</label>
            <input
              type="text"
              value={priceZip}
              onChange={(e) => setPriceZip(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchPriceCompare()}
              placeholder="33602"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-slate-800"
            />
          </div>
          <button
            type="button"
            onClick={fetchPriceCompare}
            disabled={priceLoading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {priceLoading ? "Searching…" : "Get prices"}
          </button>
        </div>
        {priceError && (
          <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg mb-4">{priceError}</p>
        )}
        {priceResult && (
          <div className="border-t border-slate-100 pt-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 mb-3">
              <span>
                {priceResult.source_status.apify_enabled ? "Prices available" : "Prices unavailable"}
                {priceResult.source_status.reason && priceResult.source_status.reason !== "OK" && (
                  <> — {priceResult.source_status.reason}</>
                )}
              </span>
              {priceResult.source_status.used_cache && (
                <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-500">From cache</span>
              )}
            </div>
            {priceResult.cheapest && (
              <div className="p-4 bg-green-50 rounded-xl mb-4">
                <p className="text-xs font-medium text-slate-500 mb-1">Cheapest</p>
                <p className="font-semibold text-slate-800">{priceResult.cheapest.name}</p>
                <p className="text-sm text-slate-600">
                  {priceResult.cheapest.store} — ${priceResult.cheapest.price.toFixed(2)}
                  {priceResult.cheapest.unit_price != null && (
                    <span className="text-slate-500"> (${priceResult.cheapest.unit_price.toFixed(2)}/unit)</span>
                  )}
                </p>
                {priceResult.cheapest.url && (
                  <a
                    href={priceResult.cheapest.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-green-600 hover:underline mt-1 inline-block"
                  >
                    View product
                  </a>
                )}
              </div>
            )}
            {priceResult.results.length > 0 ? (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {priceResult.results.map((r, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 px-3 rounded-lg bg-slate-50 text-sm">
                    <span className="font-medium text-slate-800">{r.name}</span>
                    <span className="text-slate-800">${r.price.toFixed(2)}</span>
                    <span className="text-slate-500">{r.store}</span>
                    {r.url && (
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline ml-auto">
                        View
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : priceResult.source_status.apify_enabled && !priceLoading && (
              <p className="text-sm text-slate-500">No results for this search.</p>
            )}
          </div>
        )}
      </section>

      {/* 3. Your list + tips */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Your Shopping List</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              placeholder="Add an item..."
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-slate-800"
            />
            <button
              type="button"
              onClick={addItem}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              Add
            </button>
          </div>
          <ul className="space-y-2 max-h-56 overflow-y-auto">
            {items.length === 0 ? (
              <li className="text-sm text-slate-500 py-4 text-center">
                No items yet. Add items above to build your list.
              </li>
            ) : (
              items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 group"
                >
                  <button
                    type="button"
                    onClick={() => toggleChecked(item.id)}
                    className="flex-shrink-0 w-5 h-5 rounded border-2 border-slate-300 flex items-center justify-center hover:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                    aria-label={item.checked ? "Uncheck" : "Check"}
                  >
                    {item.checked && <span className="text-green-600 font-bold">✓</span>}
                  </button>
                  <span
                    className={`flex-1 text-slate-800 ${item.checked ? "line-through text-slate-500" : ""}`}
                  >
                    {item.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 rounded transition-opacity"
                    aria-label="Remove"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))
            )}
          </ul>
          {uncheckedItems.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-2">Take these to compare prices at stores</p>
              <ul className="flex flex-wrap gap-2">
                {uncheckedItems.map((item) => (
                  <li
                    key={item.id}
                    className="px-3 py-1.5 bg-slate-100 text-slate-800 rounded-full text-sm"
                  >
                    {item.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Tips</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-3 bg-green-50 rounded-xl">
              <span className="font-medium text-slate-800 text-sm">📍 Store locator</span>
              <p className="text-xs text-slate-600 mt-1">Use your location or search above to see grocery stores on the map.</p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl">
              <span className="font-medium text-slate-800 text-sm">💰 Compare prices</span>
              <p className="text-xs text-slate-600 mt-1">Use the Compare prices section above: enter an item and ZIP to see Instacart prices and the cheapest option.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
