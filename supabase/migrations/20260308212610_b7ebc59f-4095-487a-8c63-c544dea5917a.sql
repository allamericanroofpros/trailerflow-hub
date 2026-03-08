
-- Add surcharge settings to organizations
ALTER TABLE public.organizations 
  ADD COLUMN IF NOT EXISTS surcharge_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS surcharge_label text NOT NULL DEFAULT 'Non-Cash Adjustment',
  ADD COLUMN IF NOT EXISTS surcharge_percent numeric NOT NULL DEFAULT 3.0,
  ADD COLUMN IF NOT EXISTS surcharge_flat numeric,
  ADD COLUMN IF NOT EXISTS surcharge_cap numeric;

-- Add surcharge tracking to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS surcharge_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS surcharge_label text;
