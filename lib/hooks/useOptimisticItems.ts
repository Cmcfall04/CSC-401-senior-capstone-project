// lib/hooks/useOptimisticItems.ts
// Custom hook for optimistic updates when managing pantry items

import { useState, useCallback } from "react";
import { 
  createItem, 
  updateItem, 
  deleteItem, 
  withOptimisticUpdate,
  CreateItemRequest,
  UpdateItemRequest,
  BackendItem,
  backendItemToFrontend,
  PaginatedItemsResponse
} from "../api";
import { type PantryItem } from "@/data/pantry-items";

type Item = PantryItem;

/**
 * Custom hook for managing items with optimistic updates
 * Provides functions that update the UI immediately before API confirmation
 */
export function useOptimisticItems(
  items: Item[],
  setItems: React.Dispatch<React.SetStateAction<Item[]>>,
  refetchItems: () => Promise<void>
) {
  const [isPending, setIsPending] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  /**
   * Optimistically create an item
   */
  const optimisticCreate = useCallback(async (itemData: CreateItemRequest): Promise<Item> => {
    // Generate a temporary ID for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const today = new Date().toISOString().split('T')[0];
    
    // Create optimistic item
    const optimisticItem: Item = {
      id: tempId,
      name: itemData.name,
      status: "fresh",
      addedAt: today,
      expiresInDays: itemData.expiration_date 
        ? Math.ceil((new Date(itemData.expiration_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : undefined,
    };

    return withOptimisticUpdate(
      () => createItem(itemData),
      {
        onOptimistic: () => {
          setIsPending(true);
          setPendingId(tempId);
          // Add item to UI immediately
          setItems((prev) => [optimisticItem, ...prev]);
        },
        onSuccess: (backendItem: BackendItem) => {
          // Replace optimistic item with real item from API
          const realItem = backendItemToFrontend(backendItem);
          setItems((prev) => 
            prev.map((item) => (item.id === tempId ? realItem : item))
          );
          setIsPending(false);
          setPendingId(null);
        },
        onError: (error, rollback) => {
          // Remove optimistic item on error
          setItems((prev) => prev.filter((item) => item.id !== tempId));
          setIsPending(false);
          setPendingId(null);
          // Optionally refetch to ensure consistency
          refetchItems().catch(console.error);
          console.error("Failed to create item:", error);
        },
      }
    ).then((backendItem) => backendItemToFrontend(backendItem));
  }, [setItems, refetchItems]);

  /**
   * Optimistically update an item
   */
  const optimisticUpdate = useCallback(async (
    itemId: string,
    itemData: UpdateItemRequest
  ): Promise<Item> => {
    // Store previous state for rollback
    let previousItem: Item | undefined;
    
    return withOptimisticUpdate(
      () => updateItem(itemId, itemData),
      {
        onOptimistic: () => {
          setIsPending(true);
          setPendingId(itemId);
          // Find and update item immediately
          setItems((prev) => {
            const item = prev.find((i) => i.id === itemId);
            previousItem = item;
            
            if (!item) return prev;
            
            // Create updated item
            const updatedItem: Item = {
              ...item,
              name: itemData.name ?? item.name,
              expiresInDays: itemData.expiration_date
                ? Math.ceil((new Date(itemData.expiration_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                : item.expiresInDays,
            };
            
            // Update status if expiration date changed
            if (updatedItem.expiresInDays !== undefined) {
              if (updatedItem.expiresInDays < 0) {
                updatedItem.status = "expired";
              } else if (updatedItem.expiresInDays <= 3) {
                updatedItem.status = "expiring";
              } else {
                updatedItem.status = "fresh";
              }
            }
            
            return prev.map((i) => (i.id === itemId ? updatedItem : i));
          });
        },
        onSuccess: (backendItem: BackendItem) => {
          // Replace with confirmed item from API
          const realItem = backendItemToFrontend(backendItem);
          setItems((prev) => 
            prev.map((item) => (item.id === itemId ? realItem : item))
          );
          setIsPending(false);
          setPendingId(null);
        },
        onError: (error, rollback) => {
          // Rollback to previous state
          if (previousItem) {
            setItems((prev) => 
              prev.map((item) => (item.id === itemId ? previousItem! : item))
            );
          } else {
            // If item wasn't found, refetch
            refetchItems().catch(console.error);
          }
          setIsPending(false);
          setPendingId(null);
          console.error("Failed to update item:", error);
        },
      }
    ).then((backendItem) => backendItemToFrontend(backendItem));
  }, [setItems, refetchItems]);

  /**
   * Optimistically delete an item
   */
  const optimisticDelete = useCallback(async (itemId: string): Promise<void> => {
    // Store item for rollback
    let deletedItem: Item | undefined;
    
    return withOptimisticUpdate(
      () => deleteItem(itemId),
      {
        onOptimistic: () => {
          setIsPending(true);
          setPendingId(itemId);
          // Remove item from UI immediately
          setItems((prev) => {
            const item = prev.find((i) => i.id === itemId);
            deletedItem = item;
            return prev.filter((i) => i.id !== itemId);
          });
        },
        onSuccess: () => {
          // Item already removed optimistically, just confirm
          setIsPending(false);
          setPendingId(null);
        },
        onError: (error, rollback) => {
          // Restore item on error
          if (deletedItem) {
            setItems((prev) => {
              // Insert back in the same position (or at beginning)
              const index = prev.findIndex((i) => i.id === deletedItem!.id);
              if (index >= 0) {
                const newItems = [...prev];
                newItems.splice(index, 0, deletedItem!);
                return newItems;
              }
              return [deletedItem!, ...prev];
            });
          } else {
            // If item wasn't found, refetch
            refetchItems().catch(console.error);
          }
          setIsPending(false);
          setPendingId(null);
          console.error("Failed to delete item:", error);
        },
      }
    );
  }, [setItems, refetchItems]);

  return {
    optimisticCreate,
    optimisticUpdate,
    optimisticDelete,
    isPending,
    pendingId,
  };
}

