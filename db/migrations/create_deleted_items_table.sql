-- Migration: Create deleted_items table to track waste saved
-- This table tracks items that were deleted to calculate waste prevention metrics

-- Create deleted_items table
CREATE TABLE IF NOT EXISTS deleted_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL,  -- Reference to the original item (for audit trail)
    user_id UUID NOT NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    expiration_date DATE,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    was_expired BOOLEAN NOT NULL,  -- True if item was expired when deleted, False if used before expiration
    was_expiring_soon BOOLEAN NOT NULL DEFAULT FALSE,  -- True if item was in "expiring soon" window (3 days)
    storage_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE,  -- When the item was originally added
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_deleted_items_user_id ON deleted_items(user_id);
CREATE INDEX IF NOT EXISTS idx_deleted_items_deleted_at ON deleted_items(deleted_at);
CREATE INDEX IF NOT EXISTS idx_deleted_items_was_expired ON deleted_items(was_expired);
CREATE INDEX IF NOT EXISTS idx_deleted_items_was_expiring_soon ON deleted_items(was_expiring_soon);

-- Add comment to table
COMMENT ON TABLE deleted_items IS 'Tracks deleted items to calculate waste saved metrics. Items deleted before expiration count as waste saved.';
