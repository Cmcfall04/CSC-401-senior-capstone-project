-- Migration: Add storage_type and is_opened columns to items table
-- Run this migration to add the missing columns that the application expects

-- Add storage_type column (pantry, fridge, or freezer)
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS storage_type TEXT DEFAULT 'pantry' CHECK (storage_type IN ('pantry', 'fridge', 'freezer'));

-- Add is_opened column (whether the item has been opened)
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS is_opened BOOLEAN DEFAULT FALSE;

-- Create index on storage_type for filtering queries
CREATE INDEX IF NOT EXISTS idx_items_storage_type ON items(storage_type);

-- Update existing rows to have default values
UPDATE items 
SET storage_type = 'pantry' 
WHERE storage_type IS NULL;

UPDATE items 
SET is_opened = FALSE 
WHERE is_opened IS NULL;
