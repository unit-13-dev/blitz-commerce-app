-- Add tiered discount functionality
-- This migration adds support for product discount tiers for group orders

-- Add group_order_enabled column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS group_order_enabled BOOLEAN DEFAULT FALSE;

-- Create product_discount_tiers table
CREATE TABLE IF NOT EXISTS public.product_discount_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tier_number INTEGER NOT NULL CHECK (tier_number > 0 AND tier_number <= 10), -- Allow up to 10 tiers for future expansion
  members_required INTEGER NOT NULL CHECK (members_required >= 3 AND members_required <= 1000), -- 3-1000 people as specified
  discount_percentage DECIMAL(5,2) NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100), -- 0.01% to 100%
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique tier numbers per product
  UNIQUE(product_id, tier_number),
  -- Ensure unique member requirements per product
  UNIQUE(product_id, members_required)
);

-- Enable RLS on product_discount_tiers
ALTER TABLE public.product_discount_tiers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for product_discount_tiers
CREATE POLICY "Anyone can view discount tiers" 
  ON public.product_discount_tiers 
  FOR SELECT 
  USING (true);

CREATE POLICY "Vendors can manage their product tiers" 
  ON public.product_discount_tiers 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.products 
      WHERE id = product_id AND vendor_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_product_discount_tiers_updated_at
    BEFORE UPDATE ON public.product_discount_tiers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_product_discount_tiers_product_id 
  ON public.product_discount_tiers(product_id);

CREATE INDEX IF NOT EXISTS idx_product_discount_tiers_members_required 
  ON public.product_discount_tiers(product_id, members_required);

-- Drop existing function if it exists to avoid parameter conflicts
DROP FUNCTION IF EXISTS public.get_applicable_discount(UUID, INTEGER);

-- Create function to get applicable discount for a group size
CREATE OR REPLACE FUNCTION public.get_applicable_discount(
  product_uuid UUID,
  member_count INTEGER
)
RETURNS DECIMAL(5,2)
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (
      SELECT discount_percentage 
      FROM public.product_discount_tiers 
      WHERE product_id = product_uuid 
        AND members_required <= member_count 
      ORDER BY members_required DESC 
      LIMIT 1
    ),
    0
  );
$$;

-- Insert some example data for testing (can be removed in production)
-- This shows how the tiers would work for a sample product
INSERT INTO public.product_discount_tiers (product_id, tier_number, members_required, discount_percentage)
SELECT 
  p.id,
  1,
  5,
  10.00
FROM public.products p 
WHERE p.group_order_enabled = true
LIMIT 1
ON CONFLICT DO NOTHING;

COMMENT ON TABLE public.product_discount_tiers IS 'Stores tiered discount information for products eligible for group orders';
COMMENT ON COLUMN public.product_discount_tiers.tier_number IS 'Tier ordering (1, 2, 3, etc.) - allows for future expansion';
COMMENT ON COLUMN public.product_discount_tiers.members_required IS 'Minimum number of group members needed for this discount tier';
COMMENT ON COLUMN public.product_discount_tiers.discount_percentage IS 'Discount percentage for this tier (0.01 to 100.00)';
COMMENT ON FUNCTION public.get_applicable_discount IS 'Returns the highest applicable discount percentage for a given product and member count'; 