
-- Tighten checklist policies to require authenticated + team membership
DROP POLICY "Team can insert checklist" ON public.event_checklist_items;
DROP POLICY "Team can update checklist" ON public.event_checklist_items;
DROP POLICY "Team can delete checklist" ON public.event_checklist_items;

CREATE POLICY "Authenticated can insert checklist" ON public.event_checklist_items
  FOR INSERT TO authenticated WITH CHECK (
    public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'staff')
  );

CREATE POLICY "Authenticated can update checklist" ON public.event_checklist_items
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'staff')
  );

CREATE POLICY "Authenticated can delete checklist" ON public.event_checklist_items
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager')
  );
