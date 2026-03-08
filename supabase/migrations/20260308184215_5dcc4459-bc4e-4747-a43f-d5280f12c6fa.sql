
-- Add serving unit columns to inventory_items
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS serving_unit text,
  ADD COLUMN IF NOT EXISTS serving_unit_conversion numeric DEFAULT 1;

COMMENT ON COLUMN public.inventory_items.serving_unit IS 'Unit used in recipes/deductions (e.g. oz). Stock is tracked in the main "unit" column (e.g. gal).';
COMMENT ON COLUMN public.inventory_items.serving_unit_conversion IS 'How many serving_units per 1 stock unit. E.g. 128 oz per 1 gal.';

-- Update deduct trigger to use conversion factor
CREATE OR REPLACE FUNCTION public.deduct_inventory_on_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ingredient RECORD;
  total_deduction numeric;
  conversion numeric;
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
    -- Get conversion factor
    SELECT COALESCE(ii.serving_unit_conversion, 1) INTO conversion
    FROM public.inventory_items ii WHERE ii.id = ingredient.inventory_item_id;

    total_deduction := (ingredient.quantity_used * NEW.quantity) / COALESCE(conversion, 1);

    UPDATE public.inventory_items
    SET current_stock = current_stock - total_deduction
    WHERE id = ingredient.inventory_item_id;

    INSERT INTO public.inventory_logs (inventory_item_id, change_amount, reason, notes)
    VALUES (ingredient.inventory_item_id, -total_deduction, 'usage',
      'Auto-deducted for order item (qty: ' || NEW.quantity || ', recipe: ' || ingredient.quantity_used || ' serving units)');
  END LOOP;

  -- 2. Modifier-based inventory adjustments
  IF NEW.modifiers IS NOT NULL AND jsonb_typeof(NEW.modifiers) = 'array' THEN
    FOR modifier_obj IN SELECT * FROM jsonb_array_elements(NEW.modifiers)
    LOOP
      IF modifier_obj->>'selectedOptions' IS NOT NULL THEN
        FOR option_obj IN SELECT * FROM jsonb_array_elements(modifier_obj->'selectedOptions')
        LOOP
          IF option_obj->'inventoryAdjustments' IS NOT NULL AND jsonb_typeof(option_obj->'inventoryAdjustments') = 'array' THEN
            FOR inv_adj IN SELECT * FROM jsonb_array_elements(option_obj->'inventoryAdjustments')
            LOOP
              -- Get conversion factor for this item
              SELECT COALESCE(ii.serving_unit_conversion, 1) INTO conversion
              FROM public.inventory_items ii WHERE ii.id = (inv_adj->>'inventoryItemId')::uuid;

              total_deduction := (COALESCE((inv_adj->>'extraQty')::numeric, 0) * NEW.quantity) / COALESCE(conversion, 1);

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
