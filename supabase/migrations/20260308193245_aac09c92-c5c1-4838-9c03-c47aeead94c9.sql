
-- Add PIN column to staff_members
ALTER TABLE public.staff_members
  ADD COLUMN IF NOT EXISTS pin text,
  ADD COLUMN IF NOT EXISTS hourly_rate numeric DEFAULT 0;

-- Create staff clock entries table
CREATE TABLE public.staff_clock_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES public.staff_members(id) ON DELETE CASCADE NOT NULL,
  org_id uuid REFERENCES public.organizations(id),
  event_id uuid REFERENCES public.events(id),
  trailer_id uuid REFERENCES public.trailers(id),
  clock_in timestamptz NOT NULL DEFAULT now(),
  clock_out timestamptz,
  hourly_rate numeric NOT NULL DEFAULT 0,
  tips_earned numeric DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_clock_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for clock entries
CREATE POLICY "Authenticated users can view clock entries"
  ON public.staff_clock_entries FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert clock entries"
  ON public.staff_clock_entries FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update clock entries"
  ON public.staff_clock_entries FOR UPDATE TO authenticated
  USING (true);

-- Index for fast lookups
CREATE INDEX idx_clock_entries_staff_id ON public.staff_clock_entries(staff_id);
CREATE INDEX idx_clock_entries_clock_in ON public.staff_clock_entries(clock_in);
