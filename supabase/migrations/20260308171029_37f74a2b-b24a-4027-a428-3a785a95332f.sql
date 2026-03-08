ALTER TABLE public.trailers
  ADD COLUMN IF NOT EXISTS avg_ticket numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_customers_per_hour numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS setup_teardown_hours numeric DEFAULT 2,
  ADD COLUMN IF NOT EXISTS fuel_cost_per_event numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS setup_cost_per_event numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS staff_required integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS staff_hourly_rate numeric DEFAULT 15,
  ADD COLUMN IF NOT EXISTS avg_food_cost_percent numeric DEFAULT 30,
  ADD COLUMN IF NOT EXISTS specialties text DEFAULT NULL;