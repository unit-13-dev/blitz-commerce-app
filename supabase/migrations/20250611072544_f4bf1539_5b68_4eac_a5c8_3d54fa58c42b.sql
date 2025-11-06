
-- Fix the infinite recursion issue in group_members policies
-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;

-- Create simple, non-recursive policies for group_members
CREATE POLICY "Enable read access for authenticated users" 
  ON public.group_members 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Enable insert for authenticated users" 
  ON public.group_members 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for group members" 
  ON public.group_members 
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- Enable RLS on group_members if not already enabled
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Create policies for groups table
DROP POLICY IF EXISTS "Users can view groups" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;

CREATE POLICY "Enable read access for groups" 
  ON public.groups 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Enable insert for authenticated users on groups" 
  ON public.groups 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = creator_id);

-- Enable RLS on groups if not already enabled
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for products
DROP POLICY IF EXISTS "Enable read access for products" ON public.products;
DROP POLICY IF EXISTS "Enable insert for vendors on products" ON public.products;
DROP POLICY IF EXISTS "Enable update for vendors on products" ON public.products;

CREATE POLICY "Enable read access for products" 
  ON public.products 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Enable insert for vendors on products" 
  ON public.products 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Enable update for vendors on products" 
  ON public.products 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = vendor_id);

-- Enable RLS on products if not already enabled
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for product images
CREATE POLICY "Allow authenticated users to upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Allow public access to product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-images');

CREATE POLICY "Allow users to update their product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

CREATE POLICY "Allow users to delete their product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');
