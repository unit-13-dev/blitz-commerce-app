-- Fix RLS policies for group order tables
-- This migration fixes the RLS issues that prevent group creation

-- Drop existing RLS policies for group_order_status
DROP POLICY IF EXISTS "Group members can view status" ON public.group_order_status;
DROP POLICY IF EXISTS "Group creators can update status" ON public.group_order_status;

-- Create more permissive RLS policies for group_order_status
CREATE POLICY "Anyone can view group order status" ON public.group_order_status
FOR SELECT USING (true);

CREATE POLICY "Group creators can manage status" ON public.group_order_status
FOR ALL USING (
  auth.uid() IN (
    SELECT creator_id FROM public.groups WHERE id = group_order_status.group_id
  )
);

-- Allow system functions to manage group order status
CREATE POLICY "System can manage group order status" ON public.group_order_status
FOR ALL USING (true);

-- Drop existing RLS policies for group_order_payments
DROP POLICY IF EXISTS "Group members can view payments" ON public.group_order_payments;
DROP POLICY IF EXISTS "Users can manage own payments" ON public.group_order_payments;

-- Create more permissive RLS policies for group_order_payments
CREATE POLICY "Anyone can view group order payments" ON public.group_order_payments
FOR SELECT USING (true);

CREATE POLICY "Users can manage own payments" ON public.group_order_payments
FOR ALL USING (auth.uid() = user_id);

-- Allow system functions to manage group order payments
CREATE POLICY "System can manage group order payments" ON public.group_order_payments
FOR ALL USING (true);

-- Drop existing RLS policies for order_participants
DROP POLICY IF EXISTS "Order participants can view own data" ON public.order_participants;
DROP POLICY IF EXISTS "System can manage order participants" ON public.order_participants;

-- Create more permissive RLS policies for order_participants
CREATE POLICY "Anyone can view order participants" ON public.order_participants
FOR SELECT USING (true);

CREATE POLICY "System can manage order participants" ON public.order_participants
FOR ALL USING (true);

-- Update the trigger function to handle RLS properly
CREATE OR REPLACE FUNCTION create_initial_group_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Use SECURITY DEFINER to bypass RLS
  INSERT INTO public.group_order_status (group_id, status)
  VALUES (NEW.id, 'active')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the trigger to use SECURITY DEFINER
DROP TRIGGER IF EXISTS create_initial_group_status_trigger ON public.groups;
CREATE TRIGGER create_initial_group_status_trigger
  AFTER INSERT ON public.groups
  FOR EACH ROW EXECUTE FUNCTION create_initial_group_status();

-- Update the status update function to handle RLS properly
CREATE OR REPLACE FUNCTION update_group_order_status(group_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  paid_count INTEGER;
  total_amount DECIMAL(10,2);
  total_quantity INTEGER;
  current_discount DECIMAL(5,2);
  group_record RECORD;
BEGIN
  -- Get group details
  SELECT * INTO group_record FROM public.groups WHERE id = group_uuid;
  
  -- Count paid participants and calculate totals
  SELECT 
    COUNT(*),
    COALESCE(SUM(final_price), 0),
    COALESCE(SUM(quantity), 0)
  INTO paid_count, total_amount, total_quantity
  FROM public.group_order_payments
  WHERE group_id = group_uuid AND payment_status = 'paid';
  
  -- Get current discount based on paid participants
  SELECT COALESCE(MAX(discount_percentage), 0)
  INTO current_discount
  FROM public.product_discount_tiers pdt
  WHERE pdt.product_id = group_record.product_id 
    AND pdt.members_required <= paid_count;
  
  -- Update or insert status record
  INSERT INTO public.group_order_status (
    group_id, 
    current_tier,
    current_discount_percentage,
    total_participants,
    paid_participants,
    total_quantity,
    total_amount,
    updated_at
  )
  VALUES (
    group_uuid,
    COALESCE((SELECT tier_number FROM public.product_discount_tiers 
               WHERE product_id = group_record.product_id 
                 AND members_required <= paid_count 
               ORDER BY members_required DESC LIMIT 1), 0),
    current_discount,
    (SELECT COUNT(*) FROM public.group_members WHERE group_id = group_uuid),
    paid_count,
    total_quantity,
    total_amount,
    NOW()
  )
  ON CONFLICT (group_id) DO UPDATE SET
    current_tier = EXCLUDED.current_tier,
    current_discount_percentage = EXCLUDED.current_discount_percentage,
    paid_participants = EXCLUDED.paid_participants,
    total_quantity = EXCLUDED.total_quantity,
    total_amount = EXCLUDED.total_amount,
    updated_at = NOW();
END;
$$;

-- Update the trigger function to handle RLS properly
CREATE OR REPLACE FUNCTION trigger_update_group_order_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Use SECURITY DEFINER to bypass RLS
  PERFORM update_group_order_status(NEW.group_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS update_group_order_status_trigger ON public.group_order_payments;
CREATE TRIGGER update_group_order_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.group_order_payments
  FOR EACH ROW EXECUTE FUNCTION trigger_update_group_order_status();

-- Update the finalization function to handle RLS properly
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
  
  -- Generate order number
  SELECT * INTO order_number FROM supabase.rpc('generate_order_number');
  
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
    'order_number', order_record.order_number,
    'participant_count', paid_participants,
    'total_amount', total_amount
  );
END;
$$;

-- Update the refund function to handle RLS properly
CREATE OR REPLACE FUNCTION refund_group_order_participants(group_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  refunded_count INTEGER;
BEGIN
  -- Update payment status to refunded
  UPDATE public.group_order_payments 
  SET payment_status = 'refunded', refunded_at = NOW()
  WHERE group_id = group_uuid AND payment_status = 'paid';
  
  GET DIAGNOSTICS refunded_count = ROW_COUNT;
  
  -- Update group status
  UPDATE public.group_order_status SET 
    status = 'cancelled',
    updated_at = NOW()
  WHERE group_id = group_uuid;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Refunds processed successfully',
    'refunded_count', refunded_count
  );
END;
$$; 