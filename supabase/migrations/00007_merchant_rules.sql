-- Merchant keyword rules for auto-matching transactions to events
CREATE TABLE merchant_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,           -- Keyword to match in merchant name (case-insensitive)
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster lookups
CREATE INDEX idx_merchant_rules_family_id ON merchant_rules(family_id);

-- Unique constraint: one keyword per family
CREATE UNIQUE INDEX idx_merchant_rules_family_keyword ON merchant_rules(family_id, keyword);

-- Enable RLS
ALTER TABLE merchant_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their family's merchant rules"
  ON merchant_rules FOR SELECT
  USING (family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create merchant rules for their family"
  ON merchant_rules FOR INSERT
  WITH CHECK (family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their family's merchant rules"
  ON merchant_rules FOR UPDATE
  USING (family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their family's merchant rules"
  ON merchant_rules FOR DELETE
  USING (family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid()));
