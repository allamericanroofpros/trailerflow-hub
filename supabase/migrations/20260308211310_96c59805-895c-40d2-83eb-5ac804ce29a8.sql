-- Add booking_id to events table for booking-to-event conversion
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL;

-- Create unique index to prevent duplicate event conversions from the same booking
CREATE UNIQUE INDEX IF NOT EXISTS events_booking_id_unique ON public.events (booking_id) WHERE booking_id IS NOT NULL;