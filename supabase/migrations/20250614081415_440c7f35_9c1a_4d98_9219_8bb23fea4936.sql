
-- Drop ALL existing policies on groups table to start fresh
DROP POLICY IF EXISTS "Group members can view private groups" ON public.groups;
DROP POLICY IF EXISTS "Anyone can view public groups" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON public.groups;
DROP POLICY IF EXISTS "Group creators can delete their groups" ON public.groups;

-- Drop ALL existing policies on group_join_requests table
DROP POLICY IF EXISTS "Group creators can view requests for their groups" ON public.group_join_requests;
DROP POLICY IF EXISTS "Group creators can update requests for their groups" ON public.group_join_requests;
DROP POLICY IF EXISTS "Users can view their own join requests" ON public.group_join_requests;
DROP POLICY IF EXISTS "Users can create join requests" ON public.group_join_requests;

-- Create the security definer function first
CREATE OR REPLACE FUNCTION public.is_group_creator(group_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups 
    WHERE id = group_uuid AND creator_id = auth.uid()
  );
$$;

-- Create simple, non-recursive policies for groups table
CREATE POLICY "view_all_groups" 
  ON public.groups 
  FOR SELECT 
  USING (true);

CREATE POLICY "create_own_groups" 
  ON public.groups 
  FOR INSERT 
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "update_own_groups" 
  ON public.groups 
  FOR UPDATE 
  USING (creator_id = auth.uid());

CREATE POLICY "delete_own_groups" 
  ON public.groups 
  FOR DELETE 
  USING (creator_id = auth.uid());

-- Create simple policies for group_join_requests
CREATE POLICY "view_own_join_requests" 
  ON public.group_join_requests 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "create_own_join_requests" 
  ON public.group_join_requests 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "creators_view_group_requests" 
  ON public.group_join_requests 
  FOR SELECT 
  USING (public.is_group_creator(group_id));

CREATE POLICY "creators_update_group_requests" 
  ON public.group_join_requests 
  FOR UPDATE 
  USING (public.is_group_creator(group_id));
