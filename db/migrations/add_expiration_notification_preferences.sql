-- Migration: Expiration notification preferences (email or SMS)
-- Run in Supabase SQL Editor to create the table for "Notify me when items are close to expire"

CREATE TABLE IF NOT EXISTS expiration_notification_preferences (
    user_id TEXT PRIMARY KEY,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
    contact TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE expiration_notification_preferences IS 'User preferences for expiration reminders: email or SMS with validated contact';
