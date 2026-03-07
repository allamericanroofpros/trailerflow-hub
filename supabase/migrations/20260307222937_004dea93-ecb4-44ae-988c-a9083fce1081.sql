
-- ============================================
-- TrailerOS Database Schema
-- ============================================

-- 1. Role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('owner', 'manager', 'staff');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'staff',
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Owners can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  business_name TEXT,
  timezone TEXT DEFAULT 'America/Los_Angeles',
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by authenticated users" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  -- Assign owner role to first user, staff to rest
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'staff');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Trailers table
CREATE TABLE public.trailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  description TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  menu_items JSONB DEFAULT '[]'::jsonb,
  hourly_cost NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trailers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trailers viewable by team" ON public.trailers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners/managers can insert trailers" ON public.trailers
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Owners/managers can update trailers" ON public.trailers
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Owners can delete trailers" ON public.trailers
  FOR DELETE USING (public.has_role(auth.uid(), 'owner'));

-- 4. Staff members table
CREATE TABLE public.staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  hourly_rate NUMERIC(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  availability JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff viewable by team" ON public.staff_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners/managers can insert staff" ON public.staff_members
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Owners/managers can update staff" ON public.staff_members
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Owners/managers can delete staff" ON public.staff_members
  FOR DELETE USING (
    public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager')
  );

-- 5. Events table
CREATE TYPE public.event_stage AS ENUM ('lead', 'applied', 'tentative', 'confirmed', 'completed', 'closed');

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  stage event_stage NOT NULL DEFAULT 'lead',
  event_date DATE,
  event_end_date DATE,
  start_time TIME,
  end_time TIME,
  location TEXT,
  address TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  attendance_estimate INTEGER,
  event_type TEXT,
  vendor_fee NUMERIC(10,2) DEFAULT 0,
  revenue_forecast_low NUMERIC(10,2),
  revenue_forecast_high NUMERIC(10,2),
  actual_revenue NUMERIC(10,2),
  confidence INTEGER DEFAULT 50 CHECK (confidence >= 0 AND confidence <= 100),
  risk_level TEXT DEFAULT 'low',
  trailer_id UUID REFERENCES public.trailers(id) ON DELETE SET NULL,
  notes TEXT,
  source TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events viewable by team" ON public.events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners/managers can insert events" ON public.events
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Owners/managers can update events" ON public.events
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Owners/managers can delete events" ON public.events
  FOR DELETE USING (
    public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager')
  );

CREATE INDEX idx_events_stage ON public.events(stage);
CREATE INDEX idx_events_date ON public.events(event_date);
CREATE INDEX idx_events_trailer ON public.events(trailer_id);

-- 6. Event checklist items
CREATE TABLE public.event_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_by UUID REFERENCES auth.users(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.event_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Checklist viewable by team" ON public.event_checklist_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Team can insert checklist" ON public.event_checklist_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Team can update checklist" ON public.event_checklist_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Team can delete checklist" ON public.event_checklist_items
  FOR DELETE TO authenticated USING (true);

-- 7. Event staff assignments
CREATE TABLE public.event_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'crew',
  hours_worked NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, staff_id)
);

ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event staff viewable by team" ON public.event_staff
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners/managers can insert event staff" ON public.event_staff
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Owners/managers can update event staff" ON public.event_staff
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Owners/managers can delete event staff" ON public.event_staff
  FOR DELETE USING (
    public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager')
  );

-- 8. Bookings
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  event_name TEXT NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  guest_count INTEGER,
  service_package TEXT,
  add_ons JSONB DEFAULT '[]'::jsonb,
  trailer_id UUID REFERENCES public.trailers(id) ON DELETE SET NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  total_price NUMERIC(10,2),
  deposit_amount NUMERIC(10,2),
  deposit_paid BOOLEAN DEFAULT false,
  balance_due NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bookings viewable by team" ON public.bookings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners/managers can update bookings" ON public.bookings
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Owners/managers can delete bookings" ON public.bookings
  FOR DELETE USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Anyone can submit bookings" ON public.bookings
  FOR INSERT WITH CHECK (true);

-- 9. Financial transactions
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  trailer_id UUID REFERENCES public.trailers(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  category TEXT,
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transactions viewable by team" ON public.transactions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners/managers can insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Owners/managers can update transactions" ON public.transactions
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Owners can delete transactions" ON public.transactions
  FOR DELETE USING (public.has_role(auth.uid(), 'owner'));

CREATE INDEX idx_transactions_event ON public.transactions(event_id);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date);

-- 10. Maintenance records
CREATE TABLE public.maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trailer_id UUID NOT NULL REFERENCES public.trailers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE,
  completed_date DATE,
  cost NUMERIC(10,2),
  completed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Maintenance viewable by team" ON public.maintenance_records
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners/managers can insert maintenance" ON public.maintenance_records
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Owners/managers can update maintenance" ON public.maintenance_records
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager')
  );

CREATE POLICY "Owners can delete maintenance" ON public.maintenance_records
  FOR DELETE USING (public.has_role(auth.uid(), 'owner'));

CREATE INDEX idx_maintenance_trailer ON public.maintenance_records(trailer_id);
CREATE INDEX idx_maintenance_due ON public.maintenance_records(due_date);

-- 11. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trailers_updated_at BEFORE UPDATE ON public.trailers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_staff_members_updated_at BEFORE UPDATE ON public.staff_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_maintenance_records_updated_at BEFORE UPDATE ON public.maintenance_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
