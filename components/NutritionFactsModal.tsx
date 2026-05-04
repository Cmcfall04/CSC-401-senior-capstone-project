"use client";

import { useCallback, useEffect, useState } from "react";
import { getAuthToken } from "@/lib/api";
import { API_BASE_URL } from "@/lib/config";

interface NutritionFactsModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  itemId: string;
  quantity: number;
}

type NutritionData = {
  name: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  saturatedFat: number | null;
  transFat: number | null;
  cholesterol: number | null;
  sodium: number | null;
  potassium: number | null;
  fiber: number | null;
  sugar: number | null;
  addedSugar: number | null;
  vitaminD: number | null;
  calcium: number | null;
  iron: number | null;
  vitaminA: number | null;
  vitaminC: number | null;
  servingSize: string;
};

function fmtNutrient(value: number | null | undefined, unit: string): string {
  if (value == null || Number.isNaN(value)) return "—";
  const rounded = Math.abs(value) >= 100 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded}${unit}`;
}

export default function NutritionFactsModal({
  isOpen,
  onClose,
  itemName,
  itemId: _itemId,
  quantity,
}: NutritionFactsModalProps) {
  const [data, setData] = useState<NutritionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) {
      setError("Please sign in to view nutrition facts.");
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const path = encodeURIComponent(itemName.trim());
      const res = await fetch(`${API_BASE_URL}/api/nutrition/${path}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const detail = typeof body.detail === "string" ? body.detail : "Could not load nutrition data.";
        throw new Error(detail);
      }
      setData((await res.json()) as NutritionData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [itemName]);

  useEffect(() => {
    if (!isOpen || !itemName.trim()) return;
    void load();
  }, [isOpen, itemName, load]);

  useEffect(() => {
    if (!isOpen) {
      setData(null);
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="nutrition-modal-title"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-2 p-4 border-b border-slate-200">
          <div className="min-w-0">
            <h2 id="nutrition-modal-title" className="text-lg font-semibold text-slate-900 truncate">
              Nutrition facts
            </h2>
            <p className="text-sm text-slate-600 truncate" title={itemName}>
              {itemName}
            </p>
            <p className="text-xs text-slate-500 mt-1">In pantry: ×{quantity}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto p-4 text-sm">
          {loading && <p className="text-slate-600 py-6 text-center">Loading USDA data…</p>}
          {error && !loading && (
            <p className="text-red-600 py-4 text-center text-sm">{error}</p>
          )}
          {data && !loading && (
            <div className="border-2 border-slate-900 rounded p-3 font-sans text-slate-900">
              <p className="font-bold text-base leading-tight mb-1">{data.name}</p>
              <p className="text-xs text-slate-600 border-b border-slate-900 pb-2 mb-2">
                Serving size {data.servingSize?.trim() || "—"}
              </p>
              <div className="flex justify-between items-end border-b-8 border-slate-900 pb-1 mb-2">
                <span className="text-2xl font-extrabold">Calories</span>
                <span className="text-3xl font-extrabold leading-none">
                  {data.calories != null ? Math.round(data.calories) : "—"}
                </span>
              </div>
              <p className="text-xs font-bold text-right border-b border-slate-400 mb-1">% Daily Value*</p>
              <Row label="Total Fat" value={fmtNutrient(data.fat, "g")} />
              <SubRow label="Saturated Fat" value={fmtNutrient(data.saturatedFat, "g")} />
              <SubRow label="Trans Fat" value={fmtNutrient(data.transFat, "g")} />
              <Row label="Cholesterol" value={fmtNutrient(data.cholesterol, "mg")} />
              <Row label="Sodium" value={fmtNutrient(data.sodium, "mg")} />
              <Row label="Total Carbohydrate" value={fmtNutrient(data.carbs, "g")} />
              <SubRow label="Dietary Fiber" value={fmtNutrient(data.fiber, "g")} />
              <SubRow label="Total Sugars" value={fmtNutrient(data.sugar, "g")} />
              <SubRow label="Added Sugars" value={fmtNutrient(data.addedSugar, "g")} />
              <Row label="Protein" value={fmtNutrient(data.protein, "g")} />
              <div className="border-t border-slate-400 mt-2 pt-2 space-y-0.5 text-xs">
                <MiniRow label="Vitamin D" value={fmtNutrient(data.vitaminD, "µg")} />
                <MiniRow label="Calcium" value={fmtNutrient(data.calcium, "mg")} />
                <MiniRow label="Iron" value={fmtNutrient(data.iron, "mg")} />
                <MiniRow label="Potassium" value={fmtNutrient(data.potassium, "mg")} />
                <MiniRow label="Vitamin A" value={fmtNutrient(data.vitaminA, "µg")} />
                <MiniRow label="Vitamin C" value={fmtNutrient(data.vitaminC, "mg")} />
              </div>
              <p className="text-[10px] text-slate-500 mt-3 leading-snug">
                * Percent daily values are not shown. Values are approximate from USDA FoodData Central for the
                closest matching food.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-slate-300 py-0.5 font-semibold">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function SubRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 border-b border-slate-200 py-0.5 pl-3 text-xs">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
