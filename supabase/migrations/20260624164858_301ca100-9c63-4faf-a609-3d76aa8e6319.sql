
DROP TABLE IF EXISTS public.trailer_daily_setup;

ALTER TABLE public.trailers
  ADD COLUMN IF NOT EXISTS online_ordering_force_closed boolean NOT NULL DEFAULT false;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pickup_at timestamptz,
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL;
