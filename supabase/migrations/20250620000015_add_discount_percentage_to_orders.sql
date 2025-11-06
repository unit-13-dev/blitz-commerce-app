-- Add discount_percentage column to orders table
-- This column is needed for group orders to track the applied discount

-- Add discount_percentage column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0;

-- Add other missing columns for group orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_group_order BOOLEAN DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.groups(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS participant_count INTEGER DEFAULT 1;

-- Create index for group_id
CREATE INDEX IF NOT EXISTS idx_orders_group_id ON public.orders(group_id);

-- Fix the finalize_group_order function to use correct column names
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
    discount_percentage,  -- Now this column exists
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
    calculated_discount_percentage,  -- Use renamed variable
    total_amount / (1 - calculated_discount_percentage / 100),  -- Use renamed variable
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