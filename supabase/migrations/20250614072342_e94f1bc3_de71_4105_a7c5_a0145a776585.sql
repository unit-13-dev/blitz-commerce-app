
-- Completely reset RLS policies for group_members table
-- First, disable RLS temporarily to clear any problematic state
ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY;

-- Drop ALL possible policy names that might exist from various migrations
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

-- Re-enable RLS with a clean slate
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Create brand new policies with unique names to avoid any conflicts
CREATE POLICY "gm_select_policy" ON public.group_members
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "gm_insert_policy" ON public.group_members
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gm_delete_policy" ON public.group_members
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Do the same for groups table to ensure consistency
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;

-- Drop all possible groups policies
DROP POLICY IF EXISTS "Enable read access for groups" ON public.groups;
DROP POLICY IF EXISTS "Enable insert for authenticated users on groups" ON public.groups;
DROP POLICY IF EXISTS "Users can view groups" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Anyone can view groups" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;

-- Re-enable RLS for groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Create new groups policies
CREATE POLICY "groups_select_policy" ON public.groups
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "groups_insert_policy" ON public.groups
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id);
