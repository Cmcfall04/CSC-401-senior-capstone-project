// components/AddItemModal.tsx
// Modal component for adding new pantry items

"use client";

import { useState, FormEvent, useEffect } from "react";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (item: { name: string; quantity: number; expiration_date?: string | null }) => Promise<void>;
  isPending?: boolean;
}

export default function AddItemModal({ isOpen, onClose, onCreate, isPending = false }: AddItemModalProps) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [expirationDate, setExpirationDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);


  // Debounced USDA search
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/food/search?query=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        setSearchResults(data || []);
        setShowResults(true);
      } catch (err) {
        console.error("Search error:", err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // Validate form
    if (!name.trim()) {
      setError("Item name is required");
      setSubmitting(false);
      return;
    }

    const quantityNum = parseInt(quantity, 10);
    if (isNaN(quantityNum) || quantityNum < 1) {
      setError("Quantity must be at least 1");
      setSubmitting(false);
      return;
    }

    // Validate expiration date is not in the past
    if (expirationDate) {
      const selectedDate = new Date(expirationDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        setError("Expiration date cannot be in the past");
        setSubmitting(false);
        return;
      }
    }

    try {
      await onCreate({
        name: name.trim(),
        quantity: quantityNum,
        expiration_date: expirationDate || null,
      });

      // Reset form and close modal on success
      setName("");
      setQuantity("1");
      setExpirationDate("");
      setError(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create item");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting && !isPending) {
      setName("");
      setQuantity("1");
      setExpirationDate("");
      setError(null);
      setSearchQuery("");
      setSearchResults([]);
      setSelectedFood(null);
      setShowResults(false);
      onClose();
    }
  };

  const handleSelectFood = (food: any) => {
    setSelectedFood(food);
    setName(food.description || food.name || "");
    setSearchQuery(food.description || food.name || "");
    setShowResults(false);
  };

  // Get today's date in YYYY-MM-DD format for the date input min attribute
  const today = new Date().toISOString().split("T")[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Add Item to Pantry</h2>
          <button
            onClick={handleClose}
            disabled={submitting || isPending}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* USDA Food Search */}
          <div className="relative">
            <label htmlFor="food-search" className="block text-sm font-medium text-gray-700 mb-1">
              Search Food Database <span className="text-red-500">*</span>
            </label>
            <input
              id="food-search"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedFood(null);
              }}
              placeholder="Type to search (e.g., milk, bread, eggs)..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-colors"
              disabled={submitting || isPending}
              autoFocus
            />
            {searching && (
              <div className="absolute right-3 top-9 text-gray-400">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
            
            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((food, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectFood(food)}
                    className="w-full text-left px-3 py-2 hover:bg-green-50 border-b border-gray-100 last:border-b-0 transition-colors"
                  >
                    <div className="font-medium text-sm text-gray-800">{food.description}</div>
                    <div className="text-xs text-gray-500">
                      {food.brandName && `${food.brandName} • `}
                      {food.dataType}
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {showResults && searchResults.length === 0 && !searching && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3">
                <p className="text-sm text-gray-500">No results found. Try a different search term.</p>
              </div>
            )}
          </div>

          {/* Selected Food Info */}
          {selectedFood && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-800">✓ Selected: {selectedFood.description}</p>
              <p className="text-xs text-green-600 mt-1">Nutritional data will be automatically saved</p>
            </div>
          )}

          {/* Item Name (hidden, auto-filled) */}
          <input type="hidden" value={name} />

          {/* Quantity */}
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
              Quantity
            </label>
            <input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-colors"
              disabled={submitting || isPending}
            />
          </div>

          {/* Expiration Date */}
          <div>
            <label htmlFor="expiration-date" className="block text-sm font-medium text-gray-700 mb-1">
              Expiration Date <span className="text-gray-500 text-xs">(optional)</span>
            </label>
            <input
              id="expiration-date"
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              min={today}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-colors"
              disabled={submitting || isPending}
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty for non-perishable items
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting || isPending}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isPending || !name.trim()}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting || isPending ? "Adding..." : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

