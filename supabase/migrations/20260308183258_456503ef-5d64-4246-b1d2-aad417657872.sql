
CREATE OR REPLACE FUNCTION public.deduct_inventory_on_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ingredient RECORD;
  total_deduction numeric;
  mod_item RECORD;
  modifier_obj jsonb;
  option_obj jsonb;
  inv_adj jsonb;
BEGIN
  -- 1. Base recipe ingredients
  FOR ingredient IN
    SELECT mii.inventory_item_id, mii.quantity_used
    FROM public.menu_item_ingredients mii
    WHERE mii.menu_item_id = NEW.menu_item_id
  LOOP
    total_deduction := ingredient.quantity_used * NEW.quantity;
    UPDATE public.inventory_items
    SET current_stock = current_stock - total_deduction
    WHERE id = ingredient.inventory_item_id;
    INSERT INTO public.inventory_logs (inventory_item_id, change_amount, reason, notes)
    VALUES (ingredient.inventory_item_id, -total_deduction, 'usage',
      'Auto-deducted for order item (qty: ' || NEW.quantity || ')');
  END LOOP;

  -- 2. Modifier-based inventory adjustments
  IF NEW.modifiers IS NOT NULL AND jsonb_typeof(NEW.modifiers) = 'array' THEN
    FOR modifier_obj IN SELECT * FROM jsonb_array_elements(NEW.modifiers)
    LOOP
      -- Each modifier has selectedOptions array
      IF modifier_obj->>'selectedOptions' IS NOT NULL THEN
        FOR option_obj IN SELECT * FROM jsonb_array_elements(modifier_obj->'selectedOptions')
        LOOP
          IF option_obj->'inventoryAdjustments' IS NOT NULL AND jsonb_typeof(option_obj->'inventoryAdjustments') = 'array' THEN
            FOR inv_adj IN SELECT * FROM jsonb_array_elements(option_obj->'inventoryAdjustments')
            LOOP
              total_deduction := COALESCE((inv_adj->>'extraQty')::numeric, 0) * NEW.quantity;
              IF total_deduction > 0 THEN
                UPDATE public.inventory_items
                SET current_stock = current_stock - total_deduction
                WHERE id = (inv_adj->>'inventoryItemId')::uuid;
                INSERT INTO public.inventory_logs (inventory_item_id, change_amount, reason, notes)
                VALUES ((inv_adj->>'inventoryItemId')::uuid, -total_deduction, 'usage',
                  'Modifier deduction for order item (qty: ' || NEW.quantity || ')');
              END IF;
            END LOOP;
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;
