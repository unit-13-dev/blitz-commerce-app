-- Add individual participant payment functionality
-- This migration adds functions for individual participant payments with order numbers

-- Function to create individual participant payment with order number
CREATE OR REPLACE FUNCTION create_individual_participant_payment(
  group_uuid UUID,
  user_uuid UUID,
  quantity INTEGER,
  shipping_address_id UUID,
  shipping_address_text TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  group_record RECORD;
  product_record RECORD;
  status_record RECORD;
  current_discount DECIMAL;
  unit_price DECIMAL;
  final_price DECIMAL;
  order_number TEXT;
  payment_record RECORD;
BEGIN
  -- Get group details
  SELECT * INTO group_record FROM groups WHERE id = group_uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  -- Get product details
  SELECT * INTO product_record FROM products WHERE id = group_record.product_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  -- Get current group status
  SELECT * INTO status_record FROM group_order_status WHERE group_id = group_uuid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Group order status not found';
  END IF;

  -- Check if user is already a member
  IF NOT EXISTS (SELECT 1 FROM group_members WHERE group_id = group_uuid AND user_id = user_uuid) THEN
    RAISE EXCEPTION 'User is not a member of this group';
  END IF;

  -- Check if user has already paid
  IF EXISTS (SELECT 1 FROM group_order_payments WHERE group_id = group_uuid AND user_id = user_uuid AND payment_status = 'paid') THEN
    RAISE EXCEPTION 'User has already paid for this group order';
  END IF;

  -- Calculate price with current discount
  current_discount := COALESCE(status_record.current_discount_percentage, 0);
  unit_price := product_record.price;
  final_price := unit_price * (1 - current_discount / 100) * quantity;

  -- Generate order number for this payment
  SELECT generate_order_number() INTO order_number;

  -- Create payment record
  INSERT INTO group_order_payments (
    group_id,
    user_id,
    quantity,
    unit_price,
    discount_percentage,
    final_price,
    payment_status,
    shipping_address_id,
    shipping_address_text,
    paid_at,
    order_number
  ) VALUES (
    group_uuid,
    user_uuid,
    quantity,
    unit_price,
    current_discount,
    final_price,
    'paid',
    shipping_address_id,
    shipping_address_text,
    NOW(),
    order_number
  ) RETURNING * INTO payment_record;

  -- Update group order status
  UPDATE group_order_status 
  SET 
    paid_participants = paid_participants + 1,
    total_quantity = total_quantity + quantity,
    total_amount = total_amount + final_price,
    updated_at = NOW()
  WHERE group_id = group_uuid;

  -- Create individual order for tracking
  INSERT INTO orders (
    user_id,
    order_number,
    total_amount,
    shipping_amount,
    shipping_address_id,
    shipping_address_text,
    payment_method,
    payment_status,
    status,
    is_group_order,
    group_id,
    discount_percentage,
    original_amount,
    participant_count
  ) VALUES (
    user_uuid,
    order_number,
    final_price,
    0, -- No shipping for group orders
    shipping_address_id,
    shipping_address_text,
    'razorpay',
    'paid',
    'paid',
    true,
    group_uuid,
    current_discount,
    unit_price * quantity,
    1
  );

  -- Create order item
  INSERT INTO order_items (
    order_id,
    product_id,
    product_name,
    product_image_url,
    quantity,
    unit_price,
    total_price
  ) SELECT 
    o.id,
    p.id,
    p.name,
    p.image_url,
    quantity,
    unit_price,
    final_price
  FROM orders o, products p
  WHERE o.order_number = order_number AND p.id = product_record.id;

  RETURN json_build_object(
    'success', true,
    'order_number', order_number,
    'payment_id', payment_record.id,
    'final_price', final_price,
    'discount_percentage', current_discount
  );
END;
$$;

-- Function to get participant payment details
CREATE OR REPLACE FUNCTION get_participant_payment_details(
  group_uuid UUID,
  user_uuid UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payment_record RECORD;
  order_record RECORD;
BEGIN
  -- Get payment details
  SELECT * INTO payment_record 
  FROM group_order_payments 
  WHERE group_id = group_uuid AND user_id = user_uuid AND payment_status = 'paid';
  
  IF NOT FOUND THEN
    RETURN json_build_object('found', false);
  END IF;

  -- Get order details
  SELECT * INTO order_record 
  FROM orders 
  WHERE order_number = payment_record.order_number;
  
  IF NOT FOUND THEN
    RETURN json_build_object('found', false);
  END IF;

  RETURN json_build_object(
    'found', true,
    'payment', payment_record,
    'order', order_record
  );
END;
$$;

-- Add order_number column to group_order_payments if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'group_order_payments' AND column_name = 'order_number') THEN
    ALTER TABLE group_order_payments ADD COLUMN order_number TEXT;
  END IF;
END $$;

-- Add index for order_number in group_order_payments
CREATE INDEX IF NOT EXISTS idx_group_order_payments_order_number ON group_order_payments(order_number);

-- Add RLS policy for the new functions
GRANT EXECUTE ON FUNCTION create_individual_participant_payment(UUID, UUID, INTEGER, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_participant_payment_details(UUID, UUID) TO authenticated; 