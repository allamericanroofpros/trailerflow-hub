
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS booking_minimum_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS booking_per_guest_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS booking_hourly_rate numeric DEFAULT 0;
