
-- Function to recalculate menu_items.cost from current inventory prices
CREATE OR REPLACE FUNCTION public.recalc_menu_costs_for_inventory_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update cost on every menu_item that uses this inventory item in its recipe
  UPDATE public.menu_items mi
  SET cost = COALESCE((
    SELECT SUM(mii.quantity_used * COALESCE(ii.cost_per_unit, 0))
    FROM public.menu_item_ingredients mii
    JOIN public.inventory_items ii ON ii.id = mii.inventory_item_id
    WHERE mii.menu_item_id = mi.id
  ), 0)
  WHERE mi.id IN (
    SELECT DISTINCT mii.menu_item_id
    FROM public.menu_item_ingredients mii
    WHERE mii.inventory_item_id = NEW.id
  );

  RETURN NEW;
END;
$$;

-- Trigger: fire after cost_per_unit changes on inventory_items
CREATE TRIGGER trg_recalc_menu_costs
AFTER UPDATE OF cost_per_unit ON public.inventory_items
FOR EACH ROW
WHEN (OLD.cost_per_unit IS DISTINCT FROM NEW.cost_per_unit)
EXECUTE FUNCTION public.recalc_menu_costs_for_inventory_item();

-- Also recalculate when recipe ingredients change
CREATE OR REPLACE FUNCTION public.recalc_menu_cost_for_recipe_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_menu_item_id uuid;
BEGIN
  target_menu_item_id := COALESCE(NEW.menu_item_id, OLD.menu_item_id);
  
  UPDATE public.menu_items mi
  SET cost = COALESCE((
    SELECT SUM(mii.quantity_used * COALESCE(ii.cost_per_unit, 0))
    FROM public.menu_item_ingredients mii
    JOIN public.inventory_items ii ON ii.id = mii.inventory_item_id
    WHERE mii.menu_item_id = mi.id
  ), 0)
  WHERE mi.id = target_menu_item_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_recalc_menu_cost_on_recipe
AFTER INSERT OR UPDATE OR DELETE ON public.menu_item_ingredients
FOR EACH ROW
EXECUTE FUNCTION public.recalc_menu_cost_for_recipe_change();
