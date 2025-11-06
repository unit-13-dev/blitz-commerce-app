
-- Completely disable RLS and drop ALL policies using dynamic SQL to catch any we might have missed
ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY;

-- Use dynamic SQL to drop ALL existing policies on group_members
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'group_members' AND schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.group_members;';
  END LOOP;
END;
$$;

-- Re-enable RLS with a completely clean slate
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Create absolutely minimal, non-recursive policies with unique names
CREATE POLICY "gm_select_nonrec" ON public.group_members
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "gm_insert_nonrec" ON public.group_members
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "gm_delete_nonrec" ON public.group_members
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Do the same complete reset for groups table
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;

-- Drop all existing groups policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'groups' AND schemaname = 'public'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.groups;';
  END LOOP;
END;
$$;

-- Re-enable RLS for groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Create minimal groups policies
CREATE POLICY "groups_select_nonrec" ON public.groups
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "groups_insert_nonrec" ON public.groups
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id);
