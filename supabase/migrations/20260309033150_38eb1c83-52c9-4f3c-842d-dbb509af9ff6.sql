
-- Platform-wide configuration key-value store (super admin only)
CREATE TABLE public.platform_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage platform config"
  ON public.platform_config FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Authenticated can read platform config"
  ON public.platform_config FOR SELECT
  TO authenticated
  USING (true);

-- Seed default config
INSERT INTO public.platform_config (key, value) VALUES
  ('platform_fees', '{"free": 1.5, "starter": 0.5, "pro": 0, "enterprise": 0}'::jsonb),
  ('default_tax', '{"enabled": true, "label": "Sales Tax", "percent": 0, "inclusive": false}'::jsonb),
  ('default_surcharge', '{"enabled": false, "label": "Non-Cash Adjustment", "percent": 3.0, "flat": null, "cap": null}'::jsonb),
  ('feature_flags', '{"ai_chat": true, "ai_discovery": true, "ai_forecasting": true, "public_bookings": true, "fleet_overview": true, "advanced_analytics": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;
