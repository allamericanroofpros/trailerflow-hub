
-- Allow authenticated users to insert their own support tickets
CREATE POLICY "Users can create support tickets"
ON public.support_tickets
FOR INSERT
TO authenticated
WITH CHECK (reporter_user_id = auth.uid());

-- Allow users to view their own support tickets
CREATE POLICY "Users can view own tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (reporter_user_id = auth.uid());

-- Allow owners/managers to delete clock entries (for mistake corrections)
CREATE POLICY "Org owner/manager can delete clock entries"
ON public.staff_clock_entries
FOR DELETE
TO authenticated
USING (has_org_role(auth.uid(), org_id, ARRAY['owner'::app_role, 'manager'::app_role]) OR is_super_admin(auth.uid()));
