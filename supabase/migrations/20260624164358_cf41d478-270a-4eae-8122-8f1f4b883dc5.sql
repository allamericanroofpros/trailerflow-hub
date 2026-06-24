
-- Add slug + ordering toggle to trailers
ALTER TABLE public.trailers
  ADD COLUMN IF NOT EXISTS slug text UNIQUE,
  ADD COLUMN IF NOT EXISTS online_ordering_enabled boolean NOT NULL DEFAULT false;

-- Backfill slugs for existing trailers
UPDATE public.trailers
SET slug = lower(regexp_replace(coalesce(name, 'trailer'), '[^a-zA-Z0-9]+', '-', 'g'))
           || '-' || substr(id::text, 1, 8)
WHERE slug IS NULL;

-- Daily ordering setup per trailer
CREATE TABLE IF NOT EXISTS public.trailer_daily_setup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trailer_id uuid NOT NULL REFERENCES public.trailers(id) ON DELETE CASCADE,
  setup_date date NOT NULL DEFAULT CURRENT_DATE,
  location text,
  ordering_enabled boolean NOT NULL DEFAULT false,
  note text,
  available_menu_item_ids uuid[] NOT NULL DEFAULT '{}',
  opens_at time,
  closes_at time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trailer_id, setup_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trailer_daily_setup TO authenticated;
GRANT SELECT ON public.trailer_daily_setup TO anon;
GRANT ALL ON public.trailer_daily_setup TO service_role;

ALTER TABLE public.trailer_daily_setup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view daily setup"
  ON public.trailer_daily_setup FOR SELECT
  USING (true);

CREATE POLICY "Org owner/manager can insert daily setup"
  ON public.trailer_daily_setup FOR INSERT
  WITH CHECK (has_org_role(auth.uid(), org_id, ARRAY['owner'::app_role, 'manager'::app_role]) OR is_super_admin(auth.uid()));

CREATE POLICY "Org owner/manager can update daily setup"
  ON public.trailer_daily_setup FOR UPDATE
  USING (has_org_role(auth.uid(), org_id, ARRAY['owner'::app_role, 'manager'::app_role]) OR is_super_admin(auth.uid()));

CREATE POLICY "Org owner can delete daily setup"
  ON public.trailer_daily_setup FOR DELETE
  USING (has_org_role(auth.uid(), org_id, ARRAY['owner'::app_role]) OR is_super_admin(auth.uid()));

CREATE TRIGGER update_trailer_daily_setup_updated_at
  BEFORE UPDATE ON public.trailer_daily_setup
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mark online orders distinctly
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS stripe_session_id text,
  ADD COLUMN IF NOT EXISTS pickup_location text;
