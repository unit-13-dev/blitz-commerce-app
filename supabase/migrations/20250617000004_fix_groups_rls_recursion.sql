-- Fix infinite recursion in groups RLS policies
-- Drop the problematic policies
DROP POLICY IF EXISTS "Public groups are viewable by everyone" ON public.groups;
DROP POLICY IF EXISTS "Private groups are viewable by members and creators" ON public.groups;

-- Create simpler, non-recursive policies
CREATE POLICY "Enable read access for all users" ON public.groups
FOR SELECT USING (true);

-- Create policy for inserting groups (only authenticated users can create groups)
CREATE POLICY "Enable insert for authenticated users only" ON public.groups
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Create policy for updating groups (only creators can update their groups)
CREATE POLICY "Enable update for group creators" ON public.groups
FOR UPDATE USING (auth.uid() = creator_id);

-- Create policy for deleting groups (only creators can delete their groups)
CREATE POLICY "Enable delete for group creators" ON public.groups
FOR DELETE USING (auth.uid() = creator_id);

-- Update the trigger function to avoid recursion
CREATE OR REPLACE FUNCTION handle_private_group_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate access code for private groups
  IF NEW.is_private = true AND NEW.access_code IS NULL THEN
    NEW.access_code := generate_unique_access_code();
    NEW.code_generated_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 