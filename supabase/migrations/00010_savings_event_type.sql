-- Add 'savings' to event_type enum and link events to savings goals

-- 1. Add 'savings' to the event_type enum
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'savings';

-- 2. Add savings_goal_id column to events table
ALTER TABLE events
ADD COLUMN savings_goal_id UUID REFERENCES savings_goals(id) ON DELETE SET NULL;

-- 3. Create index for the new column
CREATE INDEX idx_events_savings_goal_id ON events(savings_goal_id);
