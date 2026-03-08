
CREATE OR REPLACE FUNCTION public.recalc_menu_costs_for_inventory_item()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.menu_items mi
  SET cost = COALESCE((
    SELECT SUM(mii.quantity_used * (COALESCE(ii.cost_per_unit, 0) / GREATEST(COALESCE(ii.serving_unit_conversion, 1), 0.0001)))
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
$function$;

CREATE OR REPLACE FUNCTION public.recalc_menu_cost_for_recipe_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_menu_item_id uuid;
BEGIN
  target_menu_item_id := COALESCE(NEW.menu_item_id, OLD.menu_item_id);
  
  UPDATE public.menu_items mi
  SET cost = COALESCE((
    SELECT SUM(mii.quantity_used * (COALESCE(ii.cost_per_unit, 0) / GREATEST(COALESCE(ii.serving_unit_conversion, 1), 0.0001)))
    FROM public.menu_item_ingredients mii
    JOIN public.inventory_items ii ON ii.id = mii.inventory_item_id
    WHERE mii.menu_item_id = mi.id
  ), 0)
  WHERE mi.id = target_menu_item_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;
