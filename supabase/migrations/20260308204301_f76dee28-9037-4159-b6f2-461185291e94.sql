
-- ============================================================
-- MULTI-TENANT ISOLATION: ORG-SCOPED RLS REWRITE
-- ============================================================

-- 1. New helper: check org membership with specific roles
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id uuid, _org_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND org_id = _org_id AND role = ANY(_roles)
  )
$$;

-- 2. Fix is_org_member signature consistency (user_id first, org_id second)
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND org_id = _org_id
  )
$$;

-- ============================================================
-- DROP ALL EXISTING POLICIES ON BUSINESS TABLES
-- ============================================================

-- bookings
DROP POLICY IF EXISTS "Anyone can submit bookings" ON public.bookings;
DROP POLICY IF EXISTS "Bookings viewable by team" ON public.bookings;
DROP POLICY IF EXISTS "Owners/managers can delete bookings" ON public.bookings;
DROP POLICY IF EXISTS "Owners/managers can update bookings" ON public.bookings;

-- event_checklist_items
DROP POLICY IF EXISTS "Authenticated can delete checklist" ON public.event_checklist_items;
DROP POLICY IF EXISTS "Authenticated can insert checklist" ON public.event_checklist_items;
DROP POLICY IF EXISTS "Authenticated can update checklist" ON public.event_checklist_items;
DROP POLICY IF EXISTS "Checklist viewable by team" ON public.event_checklist_items;

-- event_staff
DROP POLICY IF EXISTS "Event staff viewable by team" ON public.event_staff;
DROP POLICY IF EXISTS "Owners/managers can delete event staff" ON public.event_staff;
DROP POLICY IF EXISTS "Owners/managers can insert event staff" ON public.event_staff;
DROP POLICY IF EXISTS "Owners/managers can update event staff" ON public.event_staff;

-- events
DROP POLICY IF EXISTS "Events viewable by team" ON public.events;
DROP POLICY IF EXISTS "Owners/managers can delete events" ON public.events;
DROP POLICY IF EXISTS "Owners/managers can insert events" ON public.events;
DROP POLICY IF EXISTS "Owners/managers can update events" ON public.events;

-- inventory_items
DROP POLICY IF EXISTS "Inventory viewable by team" ON public.inventory_items;
DROP POLICY IF EXISTS "Owners can delete inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Owners/managers can insert inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Owners/managers can update inventory" ON public.inventory_items;

-- inventory_logs
DROP POLICY IF EXISTS "Inventory logs viewable by team" ON public.inventory_logs;
DROP POLICY IF EXISTS "Owners/managers can delete inventory logs" ON public.inventory_logs;
DROP POLICY IF EXISTS "Team can create inventory logs" ON public.inventory_logs;

-- maintenance_records
DROP POLICY IF EXISTS "Maintenance viewable by team" ON public.maintenance_records;
DROP POLICY IF EXISTS "Owners can delete maintenance" ON public.maintenance_records;
DROP POLICY IF EXISTS "Owners/managers can insert maintenance" ON public.maintenance_records;
DROP POLICY IF EXISTS "Owners/managers can update maintenance" ON public.maintenance_records;

-- menu_item_ingredients
DROP POLICY IF EXISTS "Owners/managers can delete recipes" ON public.menu_item_ingredients;
DROP POLICY IF EXISTS "Owners/managers can insert recipes" ON public.menu_item_ingredients;
DROP POLICY IF EXISTS "Owners/managers can update recipes" ON public.menu_item_ingredients;
DROP POLICY IF EXISTS "Recipes viewable by team" ON public.menu_item_ingredients;

-- menu_items
DROP POLICY IF EXISTS "Menu items viewable by team" ON public.menu_items;
DROP POLICY IF EXISTS "Owners can delete menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Owners/managers can insert menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Owners/managers can update menu items" ON public.menu_items;

-- order_items
DROP POLICY IF EXISTS "Order items viewable by team" ON public.order_items;
DROP POLICY IF EXISTS "Owners can delete order items" ON public.order_items;
DROP POLICY IF EXISTS "Team can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Team can update order items" ON public.order_items;

-- orders
DROP POLICY IF EXISTS "Orders viewable by team" ON public.orders;
DROP POLICY IF EXISTS "Owners can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Team can create orders" ON public.orders;
DROP POLICY IF EXISTS "Team can update orders" ON public.orders;

-- staff_members
DROP POLICY IF EXISTS "Staff viewable by team" ON public.staff_members;
DROP POLICY IF EXISTS "Owners/managers can delete staff" ON public.staff_members;
DROP POLICY IF EXISTS "Owners/managers can insert staff" ON public.staff_members;
DROP POLICY IF EXISTS "Owners/managers can update staff" ON public.staff_members;

-- staff_clock_entries
DROP POLICY IF EXISTS "Authenticated users can view clock entries" ON public.staff_clock_entries;
DROP POLICY IF EXISTS "Org members can insert clock entries" ON public.staff_clock_entries;
DROP POLICY IF EXISTS "Org members can update clock entries" ON public.staff_clock_entries;

-- trailers
DROP POLICY IF EXISTS "Trailers viewable by team" ON public.trailers;
DROP POLICY IF EXISTS "Owners can delete trailers" ON public.trailers;
DROP POLICY IF EXISTS "Owners/managers can insert trailers" ON public.trailers;
DROP POLICY IF EXISTS "Owners/managers can update trailers" ON public.trailers;

-- transactions
DROP POLICY IF EXISTS "Transactions viewable by team" ON public.transactions;
DROP POLICY IF EXISTS "Owners can delete transactions" ON public.transactions;
DROP POLICY IF EXISTS "Owners/managers can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Owners/managers can update transactions" ON public.transactions;

-- ============================================================
-- CREATE NEW ORG-SCOPED POLICIES
-- Pattern: org member can SELECT, org role determines write access
-- Super admin always bypasses
-- ============================================================

-- === BOOKINGS ===
-- Public INSERT for booking portal (no auth required)
CREATE POLICY "Public can submit bookings" ON public.bookings
  FOR INSERT WITH CHECK (true);
-- SELECT: org members + super admin (+ anon for public booking availability)
CREATE POLICY "Org members can view bookings" ON public.bookings
  FOR SELECT USING (
    is_org_member(auth.uid(), org_id) OR is_super_admin(auth.uid()) OR auth.uid() IS NULL
  );
CREATE POLICY "Org owner/manager can update bookings" ON public.bookings
  FOR UPDATE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager']::app_role[]) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner can delete bookings" ON public.bookings
  FOR DELETE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner']::app_role[]) OR is_super_admin(auth.uid())
  );

-- === EVENTS ===
-- SELECT allows anon for public booking calendar
CREATE POLICY "Org members can view events" ON public.events
  FOR SELECT USING (
    is_org_member(auth.uid(), org_id) OR is_super_admin(auth.uid()) OR auth.uid() IS NULL
  );
CREATE POLICY "Org owner/manager can insert events" ON public.events
  FOR INSERT WITH CHECK (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager']::app_role[]) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner/manager can update events" ON public.events
  FOR UPDATE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager']::app_role[]) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner/manager can delete events" ON public.events
  FOR DELETE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager']::app_role[]) OR is_super_admin(auth.uid())
  );

-- === EVENT_CHECKLIST_ITEMS ===
CREATE POLICY "Org members can view checklist" ON public.event_checklist_items
  FOR SELECT USING (
    is_org_member(auth.uid(), org_id) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org team can insert checklist" ON public.event_checklist_items
  FOR INSERT WITH CHECK (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager','staff']::app_role[]) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org team can update checklist" ON public.event_checklist_items
  FOR UPDATE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager','staff']::app_role[]) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner/manager can delete checklist" ON public.event_checklist_items
  FOR DELETE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager']::app_role[]) OR is_super_admin(auth.uid())
  );

-- === EVENT_STAFF ===
CREATE POLICY "Org members can view event staff" ON public.event_staff
  FOR SELECT USING (
    is_org_member(auth.uid(), org_id) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner/manager can insert event staff" ON public.event_staff
  FOR INSERT WITH CHECK (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager']::app_role[]) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner/manager can update event staff" ON public.event_staff
  FOR UPDATE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager']::app_role[]) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner/manager can delete event staff" ON public.event_staff
  FOR DELETE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager']::app_role[]) OR is_super_admin(auth.uid())
  );

-- === INVENTORY_ITEMS ===
CREATE POLICY "Org members can view inventory" ON public.inventory_items
  FOR SELECT USING (
    is_org_member(auth.uid(), org_id) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner/manager can insert inventory" ON public.inventory_items
  FOR INSERT WITH CHECK (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager']::app_role[]) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner/manager can update inventory" ON public.inventory_items
  FOR UPDATE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager']::app_role[]) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner can delete inventory" ON public.inventory_items
  FOR DELETE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner']::app_role[]) OR is_super_admin(auth.uid())
  );

-- === INVENTORY_LOGS ===
CREATE POLICY "Org members can view inventory logs" ON public.inventory_logs
  FOR SELECT USING (
    is_org_member(auth.uid(), org_id) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org team can insert inventory logs" ON public.inventory_logs
  FOR INSERT WITH CHECK (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager','staff']::app_role[]) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner/manager can delete inventory logs" ON public.inventory_logs
  FOR DELETE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager']::app_role[]) OR is_super_admin(auth.uid())
  );

-- === MAINTENANCE_RECORDS ===
CREATE POLICY "Org members can view maintenance" ON public.maintenance_records
  FOR SELECT USING (
    is_org_member(auth.uid(), org_id) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner/manager can insert maintenance" ON public.maintenance_records
  FOR INSERT WITH CHECK (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager']::app_role[]) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner/manager can update maintenance" ON public.maintenance_records
  FOR UPDATE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager']::app_role[]) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner can delete maintenance" ON public.maintenance_records
  FOR DELETE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner']::app_role[]) OR is_super_admin(auth.uid())
  );

-- === MENU_ITEMS ===
-- Public SELECT for POS receipt page (no auth)
CREATE POLICY "Org members can view menu items" ON public.menu_items
  FOR SELECT USING (
    is_org_member(auth.uid(), org_id) OR is_super_admin(auth.uid()) OR auth.uid() IS NULL
  );
CREATE POLICY "Org owner/manager can insert menu items" ON public.menu_items
  FOR INSERT WITH CHECK (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager']::app_role[]) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner/manager can update menu items" ON public.menu_items
  FOR UPDATE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager']::app_role[]) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner can delete menu items" ON public.menu_items
  FOR DELETE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner']::app_role[]) OR is_super_admin(auth.uid())
  );

-- === MENU_ITEM_INGREDIENTS ===
CREATE POLICY "Org members can view recipes" ON public.menu_item_ingredients
  FOR SELECT USING (
    is_org_member(auth.uid(), org_id) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner/manager can insert recipes" ON public.menu_item_ingredients
  FOR INSERT WITH CHECK (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager']::app_role[]) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner/manager can update recipes" ON public.menu_item_ingredients
  FOR UPDATE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager']::app_role[]) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner/manager can delete recipes" ON public.menu_item_ingredients
  FOR DELETE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager']::app_role[]) OR is_super_admin(auth.uid())
  );

-- === ORDERS ===
CREATE POLICY "Org members can view orders" ON public.orders
  FOR SELECT USING (
    is_org_member(auth.uid(), org_id) OR is_super_admin(auth.uid()) OR auth.uid() IS NULL
  );
CREATE POLICY "Org team can insert orders" ON public.orders
  FOR INSERT WITH CHECK (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager','staff']::app_role[]) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org team can update orders" ON public.orders
  FOR UPDATE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager','staff']::app_role[]) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner can delete orders" ON public.orders
  FOR DELETE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner']::app_role[]) OR is_super_admin(auth.uid())
  );

-- === ORDER_ITEMS ===
CREATE POLICY "Org members can view order items" ON public.order_items
  FOR SELECT USING (
    is_org_member(auth.uid(), org_id) OR is_super_admin(auth.uid()) OR auth.uid() IS NULL
  );
CREATE POLICY "Org team can insert order items" ON public.order_items
  FOR INSERT WITH CHECK (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager','staff']::app_role[]) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org team can update order items" ON public.order_items
  FOR UPDATE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager','staff']::app_role[]) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner can delete order items" ON public.order_items
  FOR DELETE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner']::app_role[]) OR is_super_admin(auth.uid())
  );

-- === STAFF_MEMBERS ===
CREATE POLICY "Org members can view staff" ON public.staff_members
  FOR SELECT USING (
    is_org_member(auth.uid(), org_id) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner/manager can insert staff" ON public.staff_members
  FOR INSERT WITH CHECK (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager']::app_role[]) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner/manager can update staff" ON public.staff_members
  FOR UPDATE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager']::app_role[]) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner/manager can delete staff" ON public.staff_members
  FOR DELETE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager']::app_role[]) OR is_super_admin(auth.uid())
  );

-- === STAFF_CLOCK_ENTRIES ===
CREATE POLICY "Org members can view clock entries" ON public.staff_clock_entries
  FOR SELECT USING (
    is_org_member(auth.uid(), org_id) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org members can insert clock entries" ON public.staff_clock_entries
  FOR INSERT WITH CHECK (
    is_org_member(auth.uid(), org_id) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org members can update clock entries" ON public.staff_clock_entries
  FOR UPDATE USING (
    is_org_member(auth.uid(), org_id) OR is_super_admin(auth.uid())
  );

-- === TRAILERS ===
-- Public SELECT for booking portal
CREATE POLICY "Org members can view trailers" ON public.trailers
  FOR SELECT USING (
    is_org_member(auth.uid(), org_id) OR is_super_admin(auth.uid()) OR auth.uid() IS NULL
  );
CREATE POLICY "Org owner/manager can insert trailers" ON public.trailers
  FOR INSERT WITH CHECK (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager']::app_role[]) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner/manager can update trailers" ON public.trailers
  FOR UPDATE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager']::app_role[]) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner can delete trailers" ON public.trailers
  FOR DELETE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner']::app_role[]) OR is_super_admin(auth.uid())
  );

-- === TRANSACTIONS ===
CREATE POLICY "Org members can view transactions" ON public.transactions
  FOR SELECT USING (
    is_org_member(auth.uid(), org_id) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner/manager can insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager']::app_role[]) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner/manager can update transactions" ON public.transactions
  FOR UPDATE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner','manager']::app_role[]) OR is_super_admin(auth.uid())
  );
CREATE POLICY "Org owner can delete transactions" ON public.transactions
  FOR DELETE USING (
    has_org_role(auth.uid(), org_id, ARRAY['owner']::app_role[]) OR is_super_admin(auth.uid())
  );
