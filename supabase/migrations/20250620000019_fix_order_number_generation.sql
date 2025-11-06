-- Add a sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq;

-- Update the generate_order_number function to use the sequence
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  order_num TEXT;
  seq_num INTEGER;
BEGIN
  seq_num := nextval('order_number_seq');
  order_num := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(seq_num::TEXT, 6, '0');
  RETURN order_num;
END;
$$; 