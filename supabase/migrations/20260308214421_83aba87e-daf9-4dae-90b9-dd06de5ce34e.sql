ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS tax_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tax_label text NOT NULL DEFAULT 'Sales Tax',
  ADD COLUMN IF NOT EXISTS tax_percent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_inclusive boolean NOT NULL DEFAULT false;