-- Add recurrence support to events
-- Run this in your Supabase SQL Editor

-- Add recurrence columns to events table
ALTER TABLE events
ADD COLUMN recurrence TEXT DEFAULT NULL,
ADD COLUMN recurrence_end_date DATE DEFAULT NULL,
ADD COLUMN recurrence_parent_id UUID REFERENCES events(id) ON DELETE CASCADE;

-- Create index for finding child events
CREATE INDEX idx_events_recurrence_parent ON events(recurrence_parent_id);

-- Recurrence values: 'weekly', 'biweekly', 'monthly', 'yearly', or NULL for one-time
