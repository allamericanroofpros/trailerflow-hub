-- Staff ↔ Trailer direct assignment join table
-- Allows assigning staff members to specific trailers for
-- access control and scheduling purposes.

CREATE TABLE IF NOT EXISTS staff_trailers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id   uuid NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  trailer_id uuid NOT NULL REFERENCES trailers(id)      ON DELETE CASCADE,
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (staff_id, trailer_id)
);

ALTER TABLE staff_trailers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can manage staff_trailers"
  ON staff_trailers
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Index for fast lookups by org
CREATE INDEX IF NOT EXISTS staff_trailers_org_id_idx ON staff_trailers (org_id);
CREATE INDEX IF NOT EXISTS staff_trailers_staff_id_idx ON staff_trailers (staff_id);
CREATE INDEX IF NOT EXISTS staff_trailers_trailer_id_idx ON staff_trailers (trailer_id);
