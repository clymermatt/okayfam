-- OKAYfam Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- FAMILIES TABLE
-- ============================================
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT 'My Family',
  monthly_budget INTEGER NOT NULL DEFAULT 0, -- stored in cents
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- PROFILES TABLE (linked to Supabase Auth)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID REFERENCES families(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- FAMILY MEMBERS TABLE (people in family, for tagging)
-- ============================================
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6', -- for UI display
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- EVENTS TABLE (the core entity)
-- ============================================
CREATE TYPE event_status AS ENUM ('upcoming', 'completed', 'cancelled');

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  estimated_cost INTEGER NOT NULL DEFAULT 0, -- in cents
  actual_cost INTEGER, -- in cents, null until completed
  status event_status NOT NULL DEFAULT 'upcoming',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- EVENT PARTICIPANTS (junction table)
-- ============================================
CREATE TABLE event_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, family_member_id)
);

-- ============================================
-- CHECKLIST ITEMS
-- ============================================
CREATE TABLE checklist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- CHECKLIST TEMPLATES
-- ============================================
CREATE TABLE checklist_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]', -- array of {title: string}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- BUDGET PERIODS (monthly snapshots)
-- ============================================
CREATE TABLE budget_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL, -- 1-12
  budget INTEGER NOT NULL DEFAULT 0, -- in cents
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(family_id, year, month)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_profiles_family_id ON profiles(family_id);
CREATE INDEX idx_events_family_id ON events(family_id);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_checklist_items_event_id ON checklist_items(event_id);
CREATE INDEX idx_family_members_family_id ON family_members(family_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_periods ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's family_id
CREATE OR REPLACE FUNCTION get_user_family_id()
RETURNS UUID AS $$
  SELECT family_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- Families: users can only see their own family
CREATE POLICY "Users can view own family"
  ON families FOR SELECT
  USING (id = get_user_family_id());

CREATE POLICY "Users can update own family"
  ON families FOR UPDATE
  USING (id = get_user_family_id());

-- Profiles: users can view/update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- Family members: access based on family_id
CREATE POLICY "Users can view family members"
  ON family_members FOR SELECT
  USING (family_id = get_user_family_id());

CREATE POLICY "Users can manage family members"
  ON family_members FOR ALL
  USING (family_id = get_user_family_id());

-- Events: access based on family_id
CREATE POLICY "Users can view family events"
  ON events FOR SELECT
  USING (family_id = get_user_family_id());

CREATE POLICY "Users can manage family events"
  ON events FOR ALL
  USING (family_id = get_user_family_id());

-- Event participants: access based on event's family_id
CREATE POLICY "Users can view event participants"
  ON event_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_participants.event_id
      AND events.family_id = get_user_family_id()
    )
  );

CREATE POLICY "Users can manage event participants"
  ON event_participants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_participants.event_id
      AND events.family_id = get_user_family_id()
    )
  );

-- Checklist items: access based on family_id
CREATE POLICY "Users can view checklist items"
  ON checklist_items FOR SELECT
  USING (family_id = get_user_family_id());

CREATE POLICY "Users can manage checklist items"
  ON checklist_items FOR ALL
  USING (family_id = get_user_family_id());

-- Checklist templates: access based on family_id
CREATE POLICY "Users can view templates"
  ON checklist_templates FOR SELECT
  USING (family_id = get_user_family_id());

CREATE POLICY "Users can manage templates"
  ON checklist_templates FOR ALL
  USING (family_id = get_user_family_id());

-- Budget periods: access based on family_id
CREATE POLICY "Users can view budget periods"
  ON budget_periods FOR SELECT
  USING (family_id = get_user_family_id());

CREATE POLICY "Users can manage budget periods"
  ON budget_periods FOR ALL
  USING (family_id = get_user_family_id());

-- ============================================
-- TRIGGER: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER families_updated_at
  BEFORE UPDATE ON families
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER checklist_items_updated_at
  BEFORE UPDATE ON checklist_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER checklist_templates_updated_at
  BEFORE UPDATE ON checklist_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- TRIGGER: Create profile and family on signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_family_id UUID;
BEGIN
  -- Create a new family for the user
  INSERT INTO families (name) VALUES ('My Family')
  RETURNING id INTO new_family_id;

  -- Create the user's profile linked to the family
  INSERT INTO profiles (id, email, full_name, family_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    new_family_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
