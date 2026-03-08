
-- RLS policies for organizations
CREATE POLICY "Members can view own org"
  ON public.organizations FOR SELECT
  USING (is_org_member(auth.uid(), id) OR is_super_admin(auth.uid()));

CREATE POLICY "Super admins can manage all orgs"
  ON public.organizations FOR ALL
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Owners can update own org"
  ON public.organizations FOR UPDATE
  USING (owner_user_id = auth.uid());

CREATE POLICY "Authenticated can create orgs"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS policies for organization_members
CREATE POLICY "Members can view own org members"
  ON public.organization_members FOR SELECT
  USING (is_org_member(auth.uid(), org_id) OR is_super_admin(auth.uid()));

CREATE POLICY "Org owners can manage members"
  ON public.organization_members FOR ALL
  USING (
    get_org_role(auth.uid(), org_id) = 'owner'
    OR is_super_admin(auth.uid())
  );

CREATE POLICY "Self-insert on org creation"
  ON public.organization_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);
