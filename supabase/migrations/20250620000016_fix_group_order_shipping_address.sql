-- Fix shipping_address_text for group orders
-- Group orders have multiple participants with different addresses, so we need to handle this properly

-- Make shipping_address_text nullable for group orders
ALTER TABLE public.orders ALTER COLUMN shipping_address_text DROP NOT NULL;

-- Update the finalize_group_order function to handle shipping address properly
CREATE OR REPLACE FUNCTION finalize_group_order(group_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  group_record RECORD;
  order_record RECORD;
  participant_record RECORD;
  paid_participants INTEGER;
  total_amount DECIMAL(10,2);
  calculated_discount_percentage DECIMAL(5,2);  -- Renamed variable to avoid conflict
  order_number TEXT;
  admin_address_text TEXT;
BEGIN
  -- Check if user is group creator
  SELECT * INTO group_record FROM public.groups WHERE id = group_uuid;
  IF group_record.creator_id != auth.uid() THEN
    RETURN json_build_object('success', false, 'message', 'Only group creator can finalize order');
  END IF;
  
  -- Check if group is still active
  IF NOT group_record.is_active THEN
    RETURN json_build_object('success', false, 'message', 'Group order is no longer active');
  END IF;
  
  -- Get paid participants count and total amount
  SELECT 
    COUNT(*),
    COALESCE(SUM(final_price), 0)
  INTO paid_participants, total_amount
  FROM public.group_order_payments
  WHERE group_id = group_uuid AND payment_status = 'paid';
  
  IF paid_participants = 0 THEN
    RETURN json_build_object('success', false, 'message', 'No paid participants found');
  END IF;
  
  -- Get current discount
  SELECT COALESCE(MAX(discount_percentage), 0)
  INTO calculated_discount_percentage  -- Use renamed variable
  FROM public.product_discount_tiers pdt
  WHERE pdt.product_id = group_record.product_id 
    AND pdt.members_required <= paid_participants;
  
  -- Use the group's order number instead of generating a new one
  order_number := group_record.order_number;
  
  -- Get admin's default address for the master order
  SELECT 
    CONCAT(full_name, ', ', address_line1, ', ', city, ', ', state, ' ', postal_code)
  INTO admin_address_text
  FROM public.user_addresses 
  WHERE user_id = group_record.creator_id AND is_default = true 
  LIMIT 1;
  
  -- If no default address found, use a placeholder
  IF admin_address_text IS NULL THEN
    admin_address_text := 'Multiple addresses - see participant details';
  END IF;
  
  -- Create master order
  INSERT INTO public.orders (
    user_id,
    order_number,
    total_amount,
    shipping_amount,
    status,
    payment_status,
    is_group_order,
    group_id,
    discount_percentage,
    original_amount,
    participant_count,
    shipping_address_text,
    created_at
  )
  VALUES (
    group_record.creator_id,
    order_number,
    total_amount,
    0, -- No shipping for group orders
    'paid',
    'paid',
    true,
    group_uuid,
    calculated_discount_percentage,
    total_amount / (1 - calculated_discount_percentage / 100),
    paid_participants,
    admin_address_text,  -- Use admin's address or placeholder
    NOW()
  )
  RETURNING * INTO order_record;
  
  -- Create participant records with their individual addresses
  FOR participant_record IN 
    SELECT * FROM public.group_order_payments 
    WHERE group_id = group_uuid AND payment_status = 'paid'
  LOOP
    INSERT INTO public.order_participants (
      order_id,
      user_id,
      quantity,
      unit_price,
      final_price,
      shipping_address_id,
      shipping_address_text
    )
    VALUES (
      order_record.id,
      participant_record.user_id,
      participant_record.quantity,
      participant_record.unit_price,
      participant_record.final_price,
      participant_record.shipping_address_id,
      participant_record.shipping_address_text
    );
  END LOOP;
  
  -- Update group status
  UPDATE public.groups SET 
    is_active = false,
    admin_finalized_at = NOW(),
    order_id = order_record.id
  WHERE id = group_uuid;
  
  UPDATE public.group_order_status SET 
    status = 'finalized',
    updated_at = NOW()
  WHERE group_id = group_uuid;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Group order finalized successfully',
    'order_id', order_record.id,
    'order_number', order_number,
    'participant_count', paid_participants,
    'total_amount', total_amount
  );
END;
$$; 