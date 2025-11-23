// lib/api.ts
// API service for pantry items

import { API_BASE_URL } from "./config";

// Types matching backend response
export interface BackendItem {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  expiration_date: string | null;
  added_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateItemRequest {
  name: string;
  quantity?: number;
  expiration_date?: string | null; // ISO date string
}

export interface UpdateItemRequest {
  name?: string;
  quantity?: number;
  expiration_date?: string | null;
}

// Helper to get user ID from session cookie
function getUserId(): string | null {
  if (typeof document === "undefined") return null;
  
  const cookies = document.cookie.split("; ");
  const sessionCookie = cookies.find((c) => c.startsWith("sp_session="));
  
  if (!sessionCookie) return null;
  
  const token = sessionCookie.split("=")[1];
  
  // Handle old format: "user_{id}" or new format: UUID
  if (token.startsWith("user_")) {
    return token.replace("user_", "");
  }
  
  return token;
}

// Helper to get auth header
function getAuthHeader(): string | null {
  const userId = getUserId();
  if (!userId) return null;
  return `Bearer ${userId}`;
}

// API client functions
export async function getItems(): Promise<BackendItem[]> {
  const authHeader = getAuthHeader();
  if (!authHeader) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_BASE_URL}/api/items`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Authentication required");
    }
    const error = await response.json().catch(() => ({ detail: "Failed to fetch items" }));
    throw new Error(error.detail || "Failed to fetch items");
  }

  return response.json();
}

export async function getItem(itemId: string): Promise<BackendItem> {
  const authHeader = getAuthHeader();
  if (!authHeader) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_BASE_URL}/api/items/${itemId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Item not found");
    }
    if (response.status === 401) {
      throw new Error("Authentication required");
    }
    const error = await response.json().catch(() => ({ detail: "Failed to fetch item" }));
    throw new Error(error.detail || "Failed to fetch item");
  }

  return response.json();
}

export async function createItem(item: CreateItemRequest): Promise<BackendItem> {
  const authHeader = getAuthHeader();
  if (!authHeader) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_BASE_URL}/api/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(item),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Authentication required");
    }
    const error = await response.json().catch(() => ({ detail: "Failed to create item" }));
    throw new Error(error.detail || "Failed to create item");
  }

  return response.json();
}

export async function updateItem(itemId: string, item: UpdateItemRequest): Promise<BackendItem> {
  const authHeader = getAuthHeader();
  if (!authHeader) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_BASE_URL}/api/items/${itemId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify(item),
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Item not found");
    }
    if (response.status === 401) {
      throw new Error("Authentication required");
    }
    const error = await response.json().catch(() => ({ detail: "Failed to update item" }));
    throw new Error(error.detail || "Failed to update item");
  }

  return response.json();
}

export async function deleteItem(itemId: string): Promise<void> {
  const authHeader = getAuthHeader();
  if (!authHeader) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_BASE_URL}/api/items/${itemId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Item not found");
    }
    if (response.status === 401) {
      throw new Error("Authentication required");
    }
    const error = await response.json().catch(() => ({ detail: "Failed to delete item" }));
    throw new Error(error.detail || "Failed to delete item");
  }
}

export async function getExpiringItems(days: number = 7): Promise<BackendItem[]> {
  const authHeader = getAuthHeader();
  if (!authHeader) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_BASE_URL}/api/items/expiring/soon?days=${days}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Authentication required");
    }
    const error = await response.json().catch(() => ({ detail: "Failed to fetch expiring items" }));
    throw new Error(error.detail || "Failed to fetch expiring items");
  }

  return response.json();
}

// Helper to convert backend item to frontend format
export function backendItemToFrontend(item: BackendItem) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let status: "fresh" | "expiring" | "expired" = "fresh";
  let expiresInDays: number | undefined;

  if (item.expiration_date) {
    const expDate = new Date(item.expiration_date);
    expDate.setHours(0, 0, 0, 0);
    const diffTime = expDate.getTime() - today.getTime();
    expiresInDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (expiresInDays < 0) {
      status = "expired";
    } else if (expiresInDays <= 3) {
      status = "expiring";
    } else {
      status = "fresh";
    }
  }

  return {
    id: item.id,
    name: item.name,
    status,
    addedAt: item.added_at.split("T")[0], // Extract date part
    expiresInDays,
  };
}

