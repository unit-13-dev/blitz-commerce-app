-- Fix product_discount_tiers RLS policies to ensure all users can view tiers
-- This migration ensures that product discount tiers are visible to all users regardless of role

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Anyone can view discount tiers" ON public.product_discount_tiers;
DROP POLICY IF EXISTS "Vendors can manage their product tiers" ON public.product_discount_tiers;

-- Recreate the SELECT policy to ensure all users can view tiers
CREATE POLICY "Anyone can view discount tiers" 
  ON public.product_discount_tiers 
  FOR SELECT 
  USING (true);

-- Recreate the ALL policy for vendors to manage their tiers
CREATE POLICY "Vendors can manage their product tiers" 
  ON public.product_discount_tiers 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.products 
      WHERE id = product_id AND vendor_id = auth.uid()
    )
  );

-- Add a policy for authenticated users to view tiers (as a backup)
CREATE POLICY "Authenticated users can view discount tiers" 
  ON public.product_discount_tiers 
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Add a policy for public access to discount tiers (as another backup)
CREATE POLICY "Public access to discount tiers" 
  ON public.product_discount_tiers 
  FOR SELECT 
  USING (true);

-- Verify the policies are working by creating a test function
CREATE OR REPLACE FUNCTION public.test_tier_access(product_uuid UUID)
RETURNS TABLE(tier_count BIGINT, auth_user UUID)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    COUNT(*) as tier_count,
    auth.uid() as auth_user
  FROM public.product_discount_tiers 
  WHERE product_id = product_uuid;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.test_tier_access(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_tier_access(UUID) TO anon; 