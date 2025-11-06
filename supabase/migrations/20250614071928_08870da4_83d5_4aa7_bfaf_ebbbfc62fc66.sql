
-- Attempt to clean and re-apply RLS policies for group_members and groups

-- Policies for group_members
-- Drop policies by the names they are (re)created with, and older/alternative names
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.group_members;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.group_members;
DROP POLICY IF EXISTS "Enable delete for group members" ON public.group_members;
DROP POLICY IF EXISTS "Users can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;
DROP POLICY IF EXISTS "Anyone can view group members" ON public.group_members;
DROP POLICY IF EXISTS "Authenticated users can join groups" ON public.group_members;

-- Re-create the simple, non-recursive policies for group_members
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

-- Ensure RLS is enabled on group_members
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Policies for groups
-- Drop policies by the names they are (re)created with, and older/alternative names
DROP POLICY IF EXISTS "Enable read access for groups" ON public.groups;
DROP POLICY IF EXISTS "Enable insert for authenticated users on groups" ON public.groups;
DROP POLICY IF EXISTS "Users can view groups" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Anyone can view groups" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;

-- Re-create the simple, non-recursive policies for groups
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

-- Ensure RLS is enabled on groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
