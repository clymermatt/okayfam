-- Merchant categories for grouping transaction keywords
-- Two types:
--   'budget' = variable spending with monthly budget (Gas, Groceries)
--   'event' = fixed recurring linked to an event (Mortgage, Netflix)

CREATE TABLE merchant_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- Category name (e.g., "Gas", "Groceries")
  keywords TEXT[] NOT NULL DEFAULT '{}', -- Array of keywords to match
  category_type TEXT NOT NULL DEFAULT 'budget', -- 'budget' or 'event'
  monthly_budget INTEGER,                -- For budget-type: monthly budget in cents
  event_id UUID REFERENCES events(id) ON DELETE SET NULL, -- For event-type: linked event
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_category_type CHECK (category_type IN ('budget', 'event')),
  CONSTRAINT budget_or_event CHECK (
    (category_type = 'budget' AND monthly_budget IS NOT NULL) OR
    (category_type = 'event' AND event_id IS NOT NULL)
  )
);

-- Index for faster lookups
CREATE INDEX idx_merchant_categories_family_id ON merchant_categories(family_id);

-- Unique constraint: one category name per family
CREATE UNIQUE INDEX idx_merchant_categories_family_name ON merchant_categories(family_id, lower(name));

-- Enable RLS
ALTER TABLE merchant_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their family's merchant categories"
  ON merchant_categories FOR SELECT
  USING (family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create merchant categories for their family"
  ON merchant_categories FOR INSERT
  WITH CHECK (family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their family's merchant categories"
  ON merchant_categories FOR UPDATE
  USING (family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their family's merchant categories"
  ON merchant_categories FOR DELETE
  USING (family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid()));

-- Migrate existing merchant_rules to merchant_categories
-- Group by event_id and combine keywords
INSERT INTO merchant_categories (family_id, name, keywords, event_id)
SELECT
  mr.family_id,
  e.title as name,
  array_agg(mr.keyword) as keywords,
  mr.event_id
FROM merchant_rules mr
JOIN events e ON e.id = mr.event_id
GROUP BY mr.family_id, mr.event_id, e.title;

-- Add category_id to bank_transactions for tracking which category a transaction belongs to
ALTER TABLE bank_transactions ADD COLUMN category_id UUID REFERENCES merchant_categories(id) ON DELETE SET NULL;
CREATE INDEX idx_bank_transactions_category_id ON bank_transactions(category_id);

-- Drop old merchant_rules table (optional - can keep for backup)
-- DROP TABLE merchant_rules;
