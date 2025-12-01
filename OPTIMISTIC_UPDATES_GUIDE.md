# Optimistic Updates & Token Refresh Guide

This guide explains the optimistic updates and token refresh features that have been implemented.

## ✅ Features Implemented

### 1. Token Refresh & Expiration Handling

**What it does:**
- Automatically detects 401 (Unauthorized) responses from the API
- Clears the session cookie when authentication fails
- Redirects users to the login page automatically
- Dispatches `auth-change` events to update UI components

**How it works:**
- All API calls now use `authenticatedFetch()` helper function
- When a 401 error is detected, the system:
  1. Clears the `sp_session` cookie
  2. Dispatches an `auth-change` event (which Navbar listens to)
  3. Redirects to `/login` after 100ms

**Example:**
```typescript
// Before (old code)
const response = await fetch(url, {
  headers: { Authorization: authHeader }
});

// After (new code - automatic)
const response = await authenticatedFetch(url);
// Handles 401 automatically!
```

### 2. Optimistic Updates

**What it does:**
- Updates the UI immediately when creating, updating, or deleting items
- Makes the app feel instant and responsive
- Automatically rolls back changes if the API call fails
- Shows pending state during API calls

**How it works:**
- Uses `withOptimisticUpdate()` utility function
- Custom hook `useOptimisticItems()` provides easy-to-use functions
- Updates UI immediately, then confirms with API response

## 📖 Usage

### Using Optimistic Updates in Components

The `useOptimisticItems` hook is already integrated into `DashboardHome.tsx`. To use it in other components:

```typescript
import { useOptimisticItems } from "@/lib/hooks/useOptimisticItems";

function MyComponent() {
  const [items, setItems] = useState<Item[]>([]);
  const fetchItems = async () => { /* ... */ };

  const {
    optimisticCreate,
    optimisticUpdate,
    optimisticDelete,
    isPending,
    pendingId,
  } = useOptimisticItems(items, setItems, fetchItems);

  // Create an item optimistically
  const handleCreate = async () => {
    try {
      await optimisticCreate({
        name: "Milk",
        quantity: 2,
        expiration_date: "2024-12-31",
      });
      // UI updates immediately, API confirms in background
    } catch (error) {
      // Error is handled automatically - UI rolls back
      alert("Failed to create item");
    }
  };

  // Update an item optimistically
  const handleUpdate = async (itemId: string) => {
    try {
      await optimisticUpdate(itemId, {
        quantity: 5,
      });
      // UI updates immediately with new quantity
    } catch (error) {
      // UI automatically rolls back to previous state
      alert("Failed to update item");
    }
  };

  // Delete an item optimistically
  const handleDelete = async (itemId: string) => {
    try {
      await optimisticDelete(itemId);
      // Item disappears from UI immediately
    } catch (error) {
      // Item reappears if delete failed
      alert("Failed to delete item");
    }
  };

  return (
    <div>
      {isPending && <p>Saving changes...</p>}
      {/* Your UI here */}
    </div>
  );
}
```

### Accessing Optimistic Functions Globally

The optimistic functions are also available globally via `window.__optimisticItemsAPI`:

```typescript
// Access from anywhere in your app
const { create, update, delete: deleteItem } = (window as any).__optimisticItemsAPI;

// Use them
await create({ name: "Bread", quantity: 1 });
await update(itemId, { quantity: 3 });
await deleteItem(itemId);
```

## 🔧 Technical Details

### Token Refresh Implementation

**File:** `lib/api.ts`

- `handleAuthError()` - Handles 401 errors globally
- `authenticatedFetch()` - Wrapper around `fetch()` that handles auth automatically
- All API functions now use `authenticatedFetch()` instead of raw `fetch()`

### Optimistic Updates Implementation

**Files:**
- `lib/api.ts` - `withOptimisticUpdate()` utility function
- `lib/hooks/useOptimisticItems.ts` - Custom React hook
- `components/DashboardHome.tsx` - Example usage

**Flow:**
1. User performs action (create/update/delete)
2. UI updates immediately with optimistic change
3. API call executes in background
4. On success: UI updates with confirmed data
5. On error: UI rolls back to previous state

## 🎯 Benefits

### Token Refresh
- ✅ Seamless user experience when tokens expire
- ✅ No need to manually handle auth errors everywhere
- ✅ Automatic redirect to login when session expires
- ✅ Consistent error handling across all API calls

### Optimistic Updates
- ✅ Instant UI feedback - feels faster
- ✅ Better user experience - no waiting for network
- ✅ Automatic rollback on errors
- ✅ Shows pending state during operations

## 🧪 Testing

### Test Token Refresh

1. **Manual Test:**
   - Login to the app
   - In browser console, clear the session cookie:
     ```javascript
     document.cookie = "sp_session=; Max-Age=0; Path=/";
     ```
   - Try to perform any API action (e.g., view pantry)
   - ✅ Should automatically redirect to `/login`

2. **API Test:**
   - Make an API call with an invalid token:
     ```bash
     curl -H "Authorization: Bearer invalid-token" http://localhost:8000/api/items
     ```
   - Should get 401 response
   - ✅ Frontend should handle it automatically

### Test Optimistic Updates

1. **Create an Item:**
   - Use optimistic create function
   - ✅ Item should appear in UI immediately
   - ✅ Item should update with real ID after API confirms

2. **Update an Item:**
   - Use optimistic update function
   - ✅ Changes should appear immediately
   - ✅ Should rollback if API fails

3. **Delete an Item:**
   - Use optimistic delete function
   - ✅ Item should disappear immediately
   - ✅ Should reappear if API fails

## 🚀 Next Steps

These features are ready to use! When you implement UI components for creating, updating, or deleting items, you can use:

- `optimisticCreate()` - For adding new items
- `optimisticUpdate()` - For editing existing items
- `optimisticDelete()` - For removing items

All functions handle the optimistic updates automatically - just call them and the UI will update immediately!

