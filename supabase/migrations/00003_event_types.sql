-- Add event type support (expense vs income)
-- Run this in your Supabase SQL Editor

ALTER TABLE events
ADD COLUMN IF NOT EXISTS event_type TEXT NOT NULL DEFAULT 'expense';

-- Valid values: 'expense' or 'income'
