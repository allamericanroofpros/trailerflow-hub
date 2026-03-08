ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tax_label text;