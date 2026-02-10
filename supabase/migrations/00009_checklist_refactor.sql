-- Checklist Refactor Migration
-- Converts from event-bound checklist items with templates to standalone checklists with optional event linking

-- 1. Create new checklists table
CREATE TABLE checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checklists_family_id ON checklists(family_id);
CREATE INDEX idx_checklists_event_id ON checklists(event_id);

-- 2. Add checklist_id to checklist_items
ALTER TABLE checklist_items ADD COLUMN checklist_id UUID REFERENCES checklists(id) ON DELETE CASCADE;

-- 3. Migrate existing data: create checklist for each event with items
INSERT INTO checklists (family_id, name, event_id)
SELECT DISTINCT ci.family_id, COALESCE(e.title, 'Checklist') || ' Checklist', ci.event_id
FROM checklist_items ci
LEFT JOIN events e ON e.id = ci.event_id
WHERE ci.event_id IS NOT NULL;

-- 4. Link existing items to new checklists
UPDATE checklist_items ci
SET checklist_id = c.id
FROM checklists c
WHERE c.event_id = ci.event_id AND c.family_id = ci.family_id;

-- 5. Make checklist_id required, drop event_id from items
ALTER TABLE checklist_items ALTER COLUMN checklist_id SET NOT NULL;
ALTER TABLE checklist_items DROP COLUMN event_id;
DROP INDEX IF EXISTS idx_checklist_items_event_id;

-- 6. Drop templates table
DROP POLICY IF EXISTS "Users can view templates" ON checklist_templates;
DROP POLICY IF EXISTS "Users can manage templates" ON checklist_templates;
DROP TABLE IF EXISTS checklist_templates;

-- 7. RLS for checklists
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view family checklists"
  ON checklists FOR SELECT USING (family_id = get_user_family_id());

CREATE POLICY "Users can manage family checklists"
  ON checklists FOR ALL USING (family_id = get_user_family_id());

-- 8. Updated_at trigger
CREATE TRIGGER checklists_updated_at
  BEFORE UPDATE ON checklists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 9. Sync completion when event completes
CREATE OR REPLACE FUNCTION sync_checklist_completion_from_event()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE checklists SET is_completed = TRUE WHERE event_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER event_status_sync_checklist
  AFTER UPDATE OF status ON events
  FOR EACH ROW EXECUTE FUNCTION sync_checklist_completion_from_event();
