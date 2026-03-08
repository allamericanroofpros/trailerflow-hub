
-- Fix overly permissive RLS on staff_clock_entries
DROP POLICY IF EXISTS "Authenticated users can insert clock entries" ON public.staff_clock_entries;
DROP POLICY IF EXISTS "Authenticated users can update clock entries" ON public.staff_clock_entries;

CREATE POLICY "Org members can insert clock entries"
  ON public.staff_clock_entries FOR INSERT TO authenticated
  WITH CHECK (org_id IS NULL OR public.is_org_member(org_id, auth.uid()));

CREATE POLICY "Org members can update clock entries"
  ON public.staff_clock_entries FOR UPDATE TO authenticated
  USING (org_id IS NULL OR public.is_org_member(org_id, auth.uid()));
