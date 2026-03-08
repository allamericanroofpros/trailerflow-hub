
-- Add is_super_admin() to all UPDATE policies on key tables

-- menu_items
DROP POLICY IF EXISTS "Owners/managers can update menu items" ON public.menu_items;
CREATE POLICY "Owners/managers can update menu items" ON public.menu_items FOR UPDATE USING (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners/managers can insert menu items" ON public.menu_items;
CREATE POLICY "Owners/managers can insert menu items" ON public.menu_items FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners can delete menu items" ON public.menu_items;
CREATE POLICY "Owners can delete menu items" ON public.menu_items FOR DELETE USING (
  has_role(auth.uid(), 'owner'::app_role) OR is_super_admin(auth.uid())
);

-- inventory_items
DROP POLICY IF EXISTS "Owners/managers can update inventory" ON public.inventory_items;
CREATE POLICY "Owners/managers can update inventory" ON public.inventory_items FOR UPDATE USING (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners/managers can insert inventory" ON public.inventory_items;
CREATE POLICY "Owners/managers can insert inventory" ON public.inventory_items FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners can delete inventory" ON public.inventory_items;
CREATE POLICY "Owners can delete inventory" ON public.inventory_items FOR DELETE USING (
  has_role(auth.uid(), 'owner'::app_role) OR is_super_admin(auth.uid())
);

-- orders
DROP POLICY IF EXISTS "Team can create orders" ON public.orders;
CREATE POLICY "Team can create orders" ON public.orders FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'staff'::app_role) OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Team can update orders" ON public.orders;
CREATE POLICY "Team can update orders" ON public.orders FOR UPDATE USING (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'staff'::app_role) OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners can delete orders" ON public.orders;
CREATE POLICY "Owners can delete orders" ON public.orders FOR DELETE USING (
  has_role(auth.uid(), 'owner'::app_role) OR is_super_admin(auth.uid())
);

-- order_items
DROP POLICY IF EXISTS "Team can create order items" ON public.order_items;
CREATE POLICY "Team can create order items" ON public.order_items FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'staff'::app_role) OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Team can update order items" ON public.order_items;
CREATE POLICY "Team can update order items" ON public.order_items FOR UPDATE USING (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'staff'::app_role) OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners can delete order items" ON public.order_items;
CREATE POLICY "Owners can delete order items" ON public.order_items FOR DELETE USING (
  has_role(auth.uid(), 'owner'::app_role) OR is_super_admin(auth.uid())
);

-- trailers
DROP POLICY IF EXISTS "Owners/managers can update trailers" ON public.trailers;
CREATE POLICY "Owners/managers can update trailers" ON public.trailers FOR UPDATE USING (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners/managers can insert trailers" ON public.trailers;
CREATE POLICY "Owners/managers can insert trailers" ON public.trailers FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners can delete trailers" ON public.trailers;
CREATE POLICY "Owners can delete trailers" ON public.trailers FOR DELETE USING (
  has_role(auth.uid(), 'owner'::app_role) OR is_super_admin(auth.uid())
);

-- events
DROP POLICY IF EXISTS "Owners/managers can update events" ON public.events;
CREATE POLICY "Owners/managers can update events" ON public.events FOR UPDATE USING (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners/managers can insert events" ON public.events;
CREATE POLICY "Owners/managers can insert events" ON public.events FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners/managers can delete events" ON public.events;
CREATE POLICY "Owners/managers can delete events" ON public.events FOR DELETE USING (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_super_admin(auth.uid())
);

-- bookings
DROP POLICY IF EXISTS "Owners/managers can update bookings" ON public.bookings;
CREATE POLICY "Owners/managers can update bookings" ON public.bookings FOR UPDATE USING (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners/managers can delete bookings" ON public.bookings;
CREATE POLICY "Owners/managers can delete bookings" ON public.bookings FOR DELETE USING (
  has_role(auth.uid(), 'owner'::app_role) OR is_super_admin(auth.uid())
);

-- transactions
DROP POLICY IF EXISTS "Owners/managers can insert transactions" ON public.transactions;
CREATE POLICY "Owners/managers can insert transactions" ON public.transactions FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners/managers can update transactions" ON public.transactions;
CREATE POLICY "Owners/managers can update transactions" ON public.transactions FOR UPDATE USING (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners can delete transactions" ON public.transactions;
CREATE POLICY "Owners can delete transactions" ON public.transactions FOR DELETE USING (
  has_role(auth.uid(), 'owner'::app_role) OR is_super_admin(auth.uid())
);

-- staff_members
DROP POLICY IF EXISTS "Owners/managers can insert staff" ON public.staff_members;
CREATE POLICY "Owners/managers can insert staff" ON public.staff_members FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners/managers can update staff" ON public.staff_members;
CREATE POLICY "Owners/managers can update staff" ON public.staff_members FOR UPDATE USING (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners/managers can delete staff" ON public.staff_members;
CREATE POLICY "Owners/managers can delete staff" ON public.staff_members FOR DELETE USING (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_super_admin(auth.uid())
);

-- maintenance_records
DROP POLICY IF EXISTS "Owners/managers can insert maintenance" ON public.maintenance_records;
CREATE POLICY "Owners/managers can insert maintenance" ON public.maintenance_records FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners/managers can update maintenance" ON public.maintenance_records;
CREATE POLICY "Owners/managers can update maintenance" ON public.maintenance_records FOR UPDATE USING (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners can delete maintenance" ON public.maintenance_records;
CREATE POLICY "Owners can delete maintenance" ON public.maintenance_records FOR DELETE USING (
  has_role(auth.uid(), 'owner'::app_role) OR is_super_admin(auth.uid())
);

-- menu_item_ingredients
DROP POLICY IF EXISTS "Owners/managers can insert recipes" ON public.menu_item_ingredients;
CREATE POLICY "Owners/managers can insert recipes" ON public.menu_item_ingredients FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners/managers can update recipes" ON public.menu_item_ingredients;
CREATE POLICY "Owners/managers can update recipes" ON public.menu_item_ingredients FOR UPDATE USING (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners/managers can delete recipes" ON public.menu_item_ingredients;
CREATE POLICY "Owners/managers can delete recipes" ON public.menu_item_ingredients FOR DELETE USING (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_super_admin(auth.uid())
);

-- event_checklist_items
DROP POLICY IF EXISTS "Authenticated can insert checklist" ON public.event_checklist_items;
CREATE POLICY "Authenticated can insert checklist" ON public.event_checklist_items FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'staff'::app_role) OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Authenticated can update checklist" ON public.event_checklist_items;
CREATE POLICY "Authenticated can update checklist" ON public.event_checklist_items FOR UPDATE USING (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'staff'::app_role) OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Authenticated can delete checklist" ON public.event_checklist_items;
CREATE POLICY "Authenticated can delete checklist" ON public.event_checklist_items FOR DELETE USING (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_super_admin(auth.uid())
);

-- event_staff
DROP POLICY IF EXISTS "Owners/managers can insert event staff" ON public.event_staff;
CREATE POLICY "Owners/managers can insert event staff" ON public.event_staff FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners/managers can update event staff" ON public.event_staff;
CREATE POLICY "Owners/managers can update event staff" ON public.event_staff FOR UPDATE USING (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners/managers can delete event staff" ON public.event_staff;
CREATE POLICY "Owners/managers can delete event staff" ON public.event_staff FOR DELETE USING (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_super_admin(auth.uid())
);

-- inventory_logs
DROP POLICY IF EXISTS "Team can create inventory logs" ON public.inventory_logs;
CREATE POLICY "Team can create inventory logs" ON public.inventory_logs FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'staff'::app_role) OR is_super_admin(auth.uid())
);

DROP POLICY IF EXISTS "Owners/managers can delete inventory logs" ON public.inventory_logs;
CREATE POLICY "Owners/managers can delete inventory logs" ON public.inventory_logs FOR DELETE USING (
  has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR is_super_admin(auth.uid())
);

-- user_roles (super admins should be able to manage all roles)
DROP POLICY IF EXISTS "Super admins can manage roles" ON public.user_roles;
CREATE POLICY "Super admins can manage roles" ON public.user_roles FOR ALL USING (is_super_admin(auth.uid()));

-- Also allow super admins to view all user roles
DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;
CREATE POLICY "Super admins can view all roles" ON public.user_roles FOR SELECT USING (is_super_admin(auth.uid()));
