-- Add 'calendar' as a third event type for events with no budget impact
-- This requires recreating the enum type

-- Step 1: Remove the default constraint temporarily
ALTER TABLE events ALTER COLUMN event_type DROP DEFAULT;

-- Step 2: Create new enum type
CREATE TYPE event_type_new AS ENUM ('expense', 'income', 'calendar');

-- Step 3: Update the column to use the new type
ALTER TABLE events
  ALTER COLUMN event_type TYPE event_type_new
  USING event_type::text::event_type_new;

-- Step 4: Drop old type and rename new one
DROP TYPE event_type;
ALTER TYPE event_type_new RENAME TO event_type;

-- Step 5: Restore the default
ALTER TABLE events ALTER COLUMN event_type SET DEFAULT 'expense';
