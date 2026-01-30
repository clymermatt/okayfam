-- Bank connections (linked via Plaid)
CREATE TABLE bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  plaid_item_id TEXT NOT NULL UNIQUE,
  plaid_access_token TEXT NOT NULL,  -- Should be encrypted at rest
  institution_name TEXT,
  institution_id TEXT,
  last_synced_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',  -- active, error, disconnected
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Individual bank accounts within a connection
CREATE TABLE bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  plaid_account_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  official_name TEXT,
  type TEXT NOT NULL,  -- depository, credit, loan, investment
  subtype TEXT,        -- checking, savings, credit card, etc
  mask TEXT,           -- Last 4 digits
  is_tracked BOOLEAN NOT NULL DEFAULT true,  -- User can exclude accounts
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bank transactions
CREATE TABLE bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  plaid_transaction_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,             -- In cents (positive = spending/outflow)
  name TEXT NOT NULL,                  -- Transaction name from bank
  merchant_name TEXT,                  -- Cleaned merchant name
  category TEXT[],                     -- Plaid categories
  date DATE NOT NULL,
  pending BOOLEAN NOT NULL DEFAULT false,
  linked_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT false,  -- User can hide transactions
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for faster lookups
CREATE INDEX idx_bank_connections_family_id ON bank_connections(family_id);
CREATE INDEX idx_bank_accounts_connection_id ON bank_accounts(connection_id);
CREATE INDEX idx_bank_accounts_family_id ON bank_accounts(family_id);
CREATE INDEX idx_bank_transactions_family_id ON bank_transactions(family_id);
CREATE INDEX idx_bank_transactions_account_id ON bank_transactions(account_id);
CREATE INDEX idx_bank_transactions_date ON bank_transactions(date);
CREATE INDEX idx_bank_transactions_linked_event ON bank_transactions(linked_event_id);

-- Enable RLS
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for bank_connections
CREATE POLICY "Users can view their family's bank connections"
  ON bank_connections FOR SELECT
  USING (family_id IN (
    SELECT family_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create bank connections for their family"
  ON bank_connections FOR INSERT
  WITH CHECK (family_id IN (
    SELECT family_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their family's bank connections"
  ON bank_connections FOR UPDATE
  USING (family_id IN (
    SELECT family_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete their family's bank connections"
  ON bank_connections FOR DELETE
  USING (family_id IN (
    SELECT family_id FROM profiles WHERE id = auth.uid()
  ));

-- RLS policies for bank_accounts
CREATE POLICY "Users can view their family's bank accounts"
  ON bank_accounts FOR SELECT
  USING (family_id IN (
    SELECT family_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create bank accounts for their family"
  ON bank_accounts FOR INSERT
  WITH CHECK (family_id IN (
    SELECT family_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their family's bank accounts"
  ON bank_accounts FOR UPDATE
  USING (family_id IN (
    SELECT family_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete their family's bank accounts"
  ON bank_accounts FOR DELETE
  USING (family_id IN (
    SELECT family_id FROM profiles WHERE id = auth.uid()
  ));

-- RLS policies for bank_transactions
CREATE POLICY "Users can view their family's bank transactions"
  ON bank_transactions FOR SELECT
  USING (family_id IN (
    SELECT family_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create bank transactions for their family"
  ON bank_transactions FOR INSERT
  WITH CHECK (family_id IN (
    SELECT family_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their family's bank transactions"
  ON bank_transactions FOR UPDATE
  USING (family_id IN (
    SELECT family_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete their family's bank transactions"
  ON bank_transactions FOR DELETE
  USING (family_id IN (
    SELECT family_id FROM profiles WHERE id = auth.uid()
  ));
