-- Fix the trigger to use the updated function that assigns order numbers
-- This ensures that when a group is created, it gets an order number immediately

-- Drop and recreate the trigger to use the updated function
DROP TRIGGER IF EXISTS create_initial_group_status_trigger ON public.groups;

-- Update the create_initial_group_status function to assign order number
CREATE OR REPLACE FUNCTION create_initial_group_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  order_num TEXT;
BEGIN
  -- Generate order number for the group
  SELECT generate_order_number() INTO order_num;
  
  -- Update the group with the order number
  UPDATE public.groups SET order_number = order_num WHERE id = NEW.id;
  
  -- Create initial group order status
  INSERT INTO public.group_order_status (
    group_id,
    current_tier,
    current_discount_percentage,
    paid_participants,
    total_quantity,
    total_amount,
    status,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    0,
    0,
    0,
    0,
    0,
    'active',
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER create_initial_group_status_trigger
  AFTER INSERT ON public.groups
  FOR EACH ROW EXECUTE FUNCTION create_initial_group_status(); 