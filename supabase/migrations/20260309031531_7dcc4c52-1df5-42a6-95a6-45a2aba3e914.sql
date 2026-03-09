
ALTER TABLE public.organizations 
  ADD COLUMN IF NOT EXISTS bookings_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS booking_deposit_percent numeric DEFAULT 25,
  ADD COLUMN IF NOT EXISTS booking_service_packages jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS booking_min_notice_days integer DEFAULT 7,
  ADD COLUMN IF NOT EXISTS booking_notes_template text DEFAULT null;
