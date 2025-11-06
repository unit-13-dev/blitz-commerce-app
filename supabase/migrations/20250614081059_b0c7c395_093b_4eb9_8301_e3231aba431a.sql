
-- Drop the problematic policies that are causing infinite recursion
DROP POLICY IF EXISTS "Group members can view members of private groups" ON public.group_members;
DROP POLICY IF EXISTS "Group creators can manage members" ON public.group_members;

-- Create simpler, non-recursive policies for group_members
CREATE POLICY "Users can view group members" 
  ON public.group_members 
  FOR SELECT 
  USING (true);

CREATE POLICY "Group creators can insert/update/delete members" 
  ON public.group_members 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.groups 
      WHERE id = group_id AND creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert themselves as members" 
  ON public.group_members 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete themselves from groups" 
  ON public.group_members 
  FOR DELETE 
  USING (user_id = auth.uid());
