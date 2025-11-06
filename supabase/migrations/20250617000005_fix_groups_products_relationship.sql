-- Fix conflicting foreign key relationships between groups and products
-- Drop any duplicate or conflicting foreign key constraints

-- First, let's check and drop any duplicate foreign key constraints
DO $$
BEGIN
    -- Drop the constraint if it exists (this is safe even if it doesn't exist)
    ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS fk_groups_product;
    ALTER TABLE public.groups DROP CONSTRAINT IF EXISTS groups_product_id_fkey;
    
    -- Recreate the constraint with a clear, unique name
    ALTER TABLE public.groups 
    ADD CONSTRAINT groups_product_id_fkey 
    FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
    
EXCEPTION
    WHEN duplicate_object THEN
        -- If constraint already exists with this name, just continue
        NULL;
END $$;

-- Ensure the groups table has the correct structure
-- Add any missing columns that might be needed
ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE CASCADE;

-- Make sure product_id is NOT NULL if it's not already
ALTER TABLE public.groups ALTER COLUMN product_id SET NOT NULL;

-- Create a unique constraint name for the groups-product relationship
-- This helps PostgREST understand which relationship to use
COMMENT ON CONSTRAINT groups_product_id_fkey ON public.groups IS 'Foreign key relationship from groups to products';

-- Add a comment to the product_id column to clarify its purpose
COMMENT ON COLUMN public.groups.product_id IS 'The product associated with this group order'; 