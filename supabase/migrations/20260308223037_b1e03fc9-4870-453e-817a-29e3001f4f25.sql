
-- Invites table for self-serve team invites
CREATE TABLE public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'staff',
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  UNIQUE(org_id, email)
);

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Org owners/managers can manage invites
CREATE POLICY "Org owner/manager can manage invites" ON public.team_invites
  FOR ALL TO authenticated
  USING (has_org_role(auth.uid(), org_id, ARRAY['owner'::app_role, 'manager'::app_role]) OR is_super_admin(auth.uid()))
  WITH CHECK (has_org_role(auth.uid(), org_id, ARRAY['owner'::app_role, 'manager'::app_role]) OR is_super_admin(auth.uid()));

-- Members can view invites for their org  
CREATE POLICY "Org members can view invites" ON public.team_invites
  FOR SELECT TO authenticated
  USING (is_org_member(auth.uid(), org_id) OR is_super_admin(auth.uid()));

-- Add onboarding fields to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS vendor_type text,
  ADD COLUMN IF NOT EXISTS team_size text,
  ADD COLUMN IF NOT EXISTS primary_use_case text,
  ADD COLUMN IF NOT EXISTS trailer_count text,
  ADD COLUMN IF NOT EXISTS referral_source text,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_step integer NOT NULL DEFAULT 0;
