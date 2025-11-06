-- Fix variable name conflict in update_group_order_status function
-- The variable 'total_quantity' conflicts with the column name 'total_quantity'

-- Update the update_group_order_status function to fix variable name conflict
CREATE OR REPLACE FUNCTION update_group_order_status(group_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  paid_count INTEGER;
  total_amount DECIMAL(10,2);
  calculated_total_quantity INTEGER;  -- Renamed variable to avoid conflict
  current_discount DECIMAL(5,2);
  group_record RECORD;
  status_record RECORD;
BEGIN
  -- Log the function call for debugging
  RAISE NOTICE 'update_group_order_status called for group_uuid: %', group_uuid;
  
  -- Get group details
  SELECT * INTO group_record FROM public.groups WHERE id = group_uuid;
  IF NOT FOUND THEN
    RAISE NOTICE 'Group not found for uuid: %', group_uuid;
    RETURN;
  END IF;
  
  -- Count paid participants and calculate totals
  SELECT 
    COUNT(*),
    COALESCE(SUM(final_price), 0),
    COALESCE(SUM(quantity), 0)
  INTO paid_count, total_amount, calculated_total_quantity  -- Use renamed variable
  FROM public.group_order_payments
  WHERE group_id = group_uuid AND payment_status = 'paid';
  
  RAISE NOTICE 'Paid participants: %, Total amount: %, Total quantity: %', paid_count, total_amount, calculated_total_quantity;
  
  -- Get current discount based on paid participants
  SELECT COALESCE(MAX(discount_percentage), 0)
  INTO current_discount
  FROM public.product_discount_tiers pdt
  WHERE pdt.product_id = group_record.product_id 
    AND pdt.members_required <= paid_count;
  
  RAISE NOTICE 'Current discount: %', current_discount;
  
  -- Check if status record exists
  SELECT * INTO status_record FROM public.group_order_status WHERE group_id = group_uuid;
  
  IF FOUND THEN
    -- Update existing status record
    UPDATE public.group_order_status SET
      current_discount_percentage = current_discount,
      paid_participants = paid_count,
      total_quantity = calculated_total_quantity,  -- Use renamed variable
      total_amount = total_amount,
      updated_at = NOW()
    WHERE group_id = group_uuid;
    
    RAISE NOTICE 'Updated existing status record for group: %', group_uuid;
  ELSE
    -- Create new status record
    INSERT INTO public.group_order_status (
      group_id,
      current_discount_percentage,
      paid_participants,
      total_quantity,
      total_amount,
      status,
      created_at,
      updated_at
    ) VALUES (
      group_uuid,
      current_discount,
      paid_count,
      calculated_total_quantity,  -- Use renamed variable
      total_amount,
      'active',
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Created new status record for group: %', group_uuid;
  END IF;
END;
$$; 