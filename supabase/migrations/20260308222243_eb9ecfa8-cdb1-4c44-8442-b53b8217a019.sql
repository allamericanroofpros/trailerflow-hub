
-- ============================================
-- CRM fields on organizations
-- ============================================
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS onboarding_stage text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS assigned_owner text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS crm_notes text,
  ADD COLUMN IF NOT EXISTS follow_up_date date,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz,
  ADD COLUMN IF NOT EXISTS health_status text NOT NULL DEFAULT 'healthy',
  ADD COLUMN IF NOT EXISTS churn_risk text NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS feature_request_notes text,
  ADD COLUMN IF NOT EXISTS support_notes text;

-- ============================================
-- Org tags (many-to-many)
-- ============================================
CREATE TABLE public.org_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, tag)
);

ALTER TABLE public.org_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage org_tags"
  ON public.org_tags FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ============================================
-- Org notes / timeline
-- ============================================
CREATE TABLE public.org_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  note_type text NOT NULL DEFAULT 'general',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.org_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage org_notes"
  ON public.org_notes FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE INDEX idx_org_notes_org ON public.org_notes (org_id, created_at DESC);

-- ============================================
-- Support tickets
-- ============================================
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  reporter_user_id uuid,
  assigned_to text,
  subject text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  category text NOT NULL DEFAULT 'support',
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage support_tickets"
  ON public.support_tickets FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE INDEX idx_support_tickets_org ON public.support_tickets (org_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets (status);

-- ============================================
-- Benchmark placeholder tables (aggregated, no raw org data)
-- ============================================
CREATE TABLE public.benchmark_event_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  region text,
  sample_size integer NOT NULL DEFAULT 0,
  avg_revenue numeric,
  avg_net_profit numeric,
  avg_attendance integer,
  avg_vendor_fee numeric,
  p25_revenue numeric,
  p75_revenue numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.benchmark_margin_by_event_type (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  vendor_type text,
  sample_size integer NOT NULL DEFAULT 0,
  avg_food_cost_pct numeric,
  avg_labor_cost_pct numeric,
  avg_gross_margin_pct numeric,
  avg_net_margin_pct numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.benchmark_avg_ticket_by_vendor_type (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_type text NOT NULL,
  region text,
  sample_size integer NOT NULL DEFAULT 0,
  avg_ticket numeric,
  median_ticket numeric,
  p25_ticket numeric,
  p75_ticket numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.benchmark_staffing_efficiency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_type text NOT NULL,
  event_type text,
  sample_size integer NOT NULL DEFAULT 0,
  avg_customers_per_staff_hour numeric,
  avg_revenue_per_labor_dollar numeric,
  avg_staff_per_event numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Benchmarks readable by all authenticated, writable by super admin
ALTER TABLE public.benchmark_event_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_margin_by_event_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_avg_ticket_by_vendor_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmark_staffing_efficiency ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read benchmarks" ON public.benchmark_event_performance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins write benchmarks" ON public.benchmark_event_performance FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Anyone can read benchmarks" ON public.benchmark_margin_by_event_type FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins write benchmarks" ON public.benchmark_margin_by_event_type FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Anyone can read benchmarks" ON public.benchmark_avg_ticket_by_vendor_type FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins write benchmarks" ON public.benchmark_avg_ticket_by_vendor_type FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Anyone can read benchmarks" ON public.benchmark_staffing_efficiency FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins write benchmarks" ON public.benchmark_staffing_efficiency FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
