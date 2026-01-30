-- Savings goals table for allocating money across months
CREATE TABLE savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount INTEGER NOT NULL, -- in cents
  target_date DATE NOT NULL,
  current_amount INTEGER NOT NULL DEFAULT 0, -- in cents, manually tracked
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their family's savings goals"
  ON savings_goals FOR SELECT
  USING (family_id IN (
    SELECT family_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create savings goals for their family"
  ON savings_goals FOR INSERT
  WITH CHECK (family_id IN (
    SELECT family_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their family's savings goals"
  ON savings_goals FOR UPDATE
  USING (family_id IN (
    SELECT family_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete their family's savings goals"
  ON savings_goals FOR DELETE
  USING (family_id IN (
    SELECT family_id FROM profiles WHERE id = auth.uid()
  ));

-- Index for faster lookups
CREATE INDEX idx_savings_goals_family_id ON savings_goals(family_id);
