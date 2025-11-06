-- Add order_number to groups table and update group creation process
-- This ensures each group order has a unique order number from creation

-- Add order_number column to groups table
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS order_number TEXT;

-- Create index for order_number
CREATE INDEX IF NOT EXISTS idx_groups_order_number ON public.groups(order_number);

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

-- Update the finalize_group_order function to use the group's order number
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
  discount_percentage DECIMAL(5,2);
  order_number TEXT;
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
  INTO discount_percentage
  FROM public.product_discount_tiers pdt
  WHERE pdt.product_id = group_record.product_id 
    AND pdt.members_required <= paid_participants;
  
  -- Use the group's order number
  order_number := group_record.order_number;
  
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
    discount_percentage,
    total_amount / (1 - discount_percentage / 100),
    paid_participants,
    NOW()
  )
  RETURNING * INTO order_record;
  
  -- Create participant records
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