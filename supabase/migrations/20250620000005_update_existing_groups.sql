-- Update existing groups that don't have order numbers
-- This ensures all existing groups have order numbers assigned

-- Update groups that don't have order_number
UPDATE public.groups 
SET order_number = generate_order_number()
WHERE order_number IS NULL; 