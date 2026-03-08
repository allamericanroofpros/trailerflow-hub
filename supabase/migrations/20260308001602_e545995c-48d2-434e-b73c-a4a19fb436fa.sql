
-- Menu categories enum
CREATE TYPE public.menu_category AS ENUM ('appetizer', 'entree', 'side', 'dessert', 'drink', 'combo', 'other');

-- Order status enum
CREATE TYPE public.order_status AS ENUM ('pending', 'preparing', 'ready', 'served', 'cancelled');

-- Payment method enum
CREATE TYPE public.payment_method AS ENUM ('cash', 'card', 'digital', 'other');

-- Inventory unit enum
CREATE TYPE public.inventory_unit AS ENUM ('oz', 'lb', 'g', 'kg', 'ml', 'l', 'gal', 'each', 'dozen', 'case');

-- Menu items table
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category menu_category NOT NULL DEFAULT 'other',
  price NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  modifiers JSONB DEFAULT '[]'::jsonb,
  trailer_id UUID REFERENCES public.trailers(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inventory items (raw ingredients)
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  unit inventory_unit NOT NULL DEFAULT 'each',
  current_stock NUMERIC NOT NULL DEFAULT 0,
  par_level NUMERIC DEFAULT 0,
  reorder_point NUMERIC DEFAULT 0,
  cost_per_unit NUMERIC DEFAULT 0,
  supplier TEXT,
  trailer_id UUID REFERENCES public.trailers(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Link menu items to ingredients (recipe)
CREATE TABLE public.menu_item_ingredients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity_used NUMERIC NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number SERIAL,
  status order_status NOT NULL DEFAULT 'pending',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  payment_method payment_method,
  payment_received BOOLEAN NOT NULL DEFAULT false,
  tip NUMERIC DEFAULT 0,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  trailer_id UUID REFERENCES public.trailers(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order line items
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  modifiers JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Inventory logs (usage, waste, restock)
CREATE TABLE public.inventory_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  change_amount NUMERIC NOT NULL,
  reason TEXT NOT NULL DEFAULT 'usage',
  notes TEXT,
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: viewable by all authenticated, editable by owner/manager
-- Menu items
CREATE POLICY "Menu items viewable by team" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Owners/managers can insert menu items" ON public.menu_items FOR INSERT WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Owners/managers can update menu items" ON public.menu_items FOR UPDATE USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Owners can delete menu items" ON public.menu_items FOR DELETE USING (has_role(auth.uid(), 'owner'));

-- Inventory items
CREATE POLICY "Inventory viewable by team" ON public.inventory_items FOR SELECT USING (true);
CREATE POLICY "Owners/managers can insert inventory" ON public.inventory_items FOR INSERT WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Owners/managers can update inventory" ON public.inventory_items FOR UPDATE USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Owners can delete inventory" ON public.inventory_items FOR DELETE USING (has_role(auth.uid(), 'owner'));

-- Menu item ingredients
CREATE POLICY "Recipes viewable by team" ON public.menu_item_ingredients FOR SELECT USING (true);
CREATE POLICY "Owners/managers can insert recipes" ON public.menu_item_ingredients FOR INSERT WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Owners/managers can update recipes" ON public.menu_item_ingredients FOR UPDATE USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));
CREATE POLICY "Owners/managers can delete recipes" ON public.menu_item_ingredients FOR DELETE USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

-- Orders: all authenticated can create (staff at POS), owner/manager can manage
CREATE POLICY "Orders viewable by team" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Team can create orders" ON public.orders FOR INSERT WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'staff'));
CREATE POLICY "Team can update orders" ON public.orders FOR UPDATE USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'staff'));
CREATE POLICY "Owners can delete orders" ON public.orders FOR DELETE USING (has_role(auth.uid(), 'owner'));

-- Order items
CREATE POLICY "Order items viewable by team" ON public.order_items FOR SELECT USING (true);
CREATE POLICY "Team can create order items" ON public.order_items FOR INSERT WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'staff'));
CREATE POLICY "Team can update order items" ON public.order_items FOR UPDATE USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'staff'));
CREATE POLICY "Owners can delete order items" ON public.order_items FOR DELETE USING (has_role(auth.uid(), 'owner'));

-- Inventory logs
CREATE POLICY "Inventory logs viewable by team" ON public.inventory_logs FOR SELECT USING (true);
CREATE POLICY "Team can create inventory logs" ON public.inventory_logs FOR INSERT WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'staff'));
CREATE POLICY "Owners/managers can delete inventory logs" ON public.inventory_logs FOR DELETE USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

-- Updated_at triggers
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
