
-- Create organization_payment_accounts table for Stripe Connect
CREATE TABLE public.organization_payment_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  stripe_connected_account_id text NOT NULL,
  stripe_connect_status text NOT NULL DEFAULT 'pending',
  stripe_charges_enabled boolean NOT NULL DEFAULT false,
  stripe_payouts_enabled boolean NOT NULL DEFAULT false,
  stripe_details_submitted boolean NOT NULL DEFAULT false,
  stripe_onboarding_started_at timestamptz,
  stripe_onboarding_completed_at timestamptz,
  stripe_requirements_json jsonb DEFAULT '{}'::jsonb,
  stripe_connect_email text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, is_active)
);

-- Enable RLS
ALTER TABLE public.organization_payment_accounts ENABLE ROW LEVEL SECURITY;

-- Org members can view their payment accounts
CREATE POLICY "Org members can view payment accounts"
  ON public.organization_payment_accounts
  FOR SELECT
  TO authenticated
  USING (is_org_member(auth.uid(), org_id) OR is_super_admin(auth.uid()));

-- Only org owners can insert payment accounts
CREATE POLICY "Org owners can insert payment accounts"
  ON public.organization_payment_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (has_org_role(auth.uid(), org_id, ARRAY['owner'::app_role]) OR is_super_admin(auth.uid()));

-- Only org owners can update payment accounts
CREATE POLICY "Org owners can update payment accounts"
  ON public.organization_payment_accounts
  FOR UPDATE
  TO authenticated
  USING (has_org_role(auth.uid(), org_id, ARRAY['owner'::app_role]) OR is_super_admin(auth.uid()));

-- Only org owners can delete payment accounts
CREATE POLICY "Org owners can delete payment accounts"
  ON public.organization_payment_accounts
  FOR DELETE
  TO authenticated
  USING (has_org_role(auth.uid(), org_id, ARRAY['owner'::app_role]) OR is_super_admin(auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_org_payment_accounts_updated_at
  BEFORE UPDATE ON public.organization_payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
