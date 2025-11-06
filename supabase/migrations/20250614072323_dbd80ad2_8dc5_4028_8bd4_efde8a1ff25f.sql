
-- Completely reset RLS policies for group_members table
-- First, disable RLS temporarily
ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY;

-- Now that RLS is disabled, we can safely drop any remaining policies
-- We'll use a more comprehensive list of potential policy names
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.group_members;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.group_members;
DROP POLICY IF EXISTS "Enable delete for group members" ON public.group_members;
DROP POLICY IF EXISTS "Users can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;
DROP POLICY IF EXISTS "Anyone can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Authenticated users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Group members can view members" ON public.group_members;
DROP POLICY IF EXISTS "Users can manage group membership" ON public.group_members;
DROP POLICY IF EXISTS "Allow group member operations" ON public.group_members;

-- Re-enable RLS
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Create only the essential, simple policies
CREATE POLICY "group_members_select_policy" ON public.group_members
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "group_members_insert_policy" ON public.group_members
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "group_members_delete_policy" ON public.group_members
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
