
-- Function to auto-deduct inventory when order items are inserted
CREATE OR REPLACE FUNCTION public.deduct_inventory_on_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ingredient RECORD;
  total_deduction numeric;
BEGIN
  -- For each ingredient linked to this menu item
  FOR ingredient IN
    SELECT mii.inventory_item_id, mii.quantity_used
    FROM public.menu_item_ingredients mii
    WHERE mii.menu_item_id = NEW.menu_item_id
  LOOP
    total_deduction := ingredient.quantity_used * NEW.quantity;

    -- Deduct stock
    UPDATE public.inventory_items
    SET current_stock = current_stock - total_deduction
    WHERE id = ingredient.inventory_item_id;

    -- Log the deduction
    INSERT INTO public.inventory_logs (inventory_item_id, change_amount, reason, notes)
    VALUES (
      ingredient.inventory_item_id,
      -total_deduction,
      'usage',
      'Auto-deducted for order item (qty: ' || NEW.quantity || ')'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger on order_items insert
CREATE TRIGGER trg_deduct_inventory_on_order
AFTER INSERT ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.deduct_inventory_on_order();
