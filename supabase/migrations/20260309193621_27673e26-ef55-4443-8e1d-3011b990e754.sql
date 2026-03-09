
-- Add founder columns to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS is_founder boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS founder_number integer,
  ADD COLUMN IF NOT EXISTS billing_interval text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS plan_price_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS founder_pricing_version text;

-- Create platform_limits single-row config table
CREATE TABLE IF NOT EXISTS public.platform_limits (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  founders_limit integer NOT NULL DEFAULT 100,
  founders_enabled boolean NOT NULL DEFAULT true,
  founders_monthly_price numeric NOT NULL DEFAULT 29,
  founders_annual_price numeric NOT NULL DEFAULT 290,
  standard_plans_active boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert the single row
INSERT INTO public.platform_limits (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- RLS for platform_limits
ALTER TABLE public.platform_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read platform_limits"
  ON public.platform_limits FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Super admins can manage platform_limits"
  ON public.platform_limits FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));
