
-- Add join_requests table to handle group join requests
CREATE TABLE public.group_join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  message TEXT,
  UNIQUE(group_id, user_id)
);

-- Enable RLS on group_join_requests
ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;

-- Policies for group_join_requests
CREATE POLICY "Users can view their own join requests" 
  ON public.group_join_requests 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Group creators can view requests for their groups" 
  ON public.group_join_requests 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.groups 
      WHERE id = group_id AND creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can create join requests" 
  ON public.group_join_requests 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Group creators can update requests for their groups" 
  ON public.group_join_requests 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.groups 
      WHERE id = group_id AND creator_id = auth.uid()
    )
  );

-- Update groups table to add more management fields
ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS auto_approve_requests BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_members INTEGER DEFAULT 50;

-- Enable RLS on groups table
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Policies for groups table
CREATE POLICY "Anyone can view public groups" 
  ON public.groups 
  FOR SELECT 
  USING (NOT is_private);

CREATE POLICY "Group members can view private groups" 
  ON public.groups 
  FOR SELECT 
  USING (
    is_private AND (
      creator_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.group_members 
        WHERE group_id = id AND user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create groups" 
  ON public.groups 
  FOR INSERT 
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Group creators can update their groups" 
  ON public.groups 
  FOR UPDATE 
  USING (creator_id = auth.uid());

CREATE POLICY "Group creators can delete their groups" 
  ON public.groups 
  FOR DELETE 
  USING (creator_id = auth.uid());

-- Enable RLS on group_members table
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Policies for group_members table
CREATE POLICY "Anyone can view group members for public groups" 
  ON public.group_members 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.groups 
      WHERE id = group_id AND NOT is_private
    )
  );

CREATE POLICY "Group members can view members of private groups" 
  ON public.group_members 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.groups 
      WHERE id = group_id AND is_private AND (
        creator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.group_members gm 
          WHERE gm.group_id = group_id AND gm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can join groups" 
  ON public.group_members 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Group creators can manage members" 
  ON public.group_members 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.groups 
      WHERE id = group_id AND creator_id = auth.uid()
    )
  );

CREATE POLICY "Users can leave groups" 
  ON public.group_members 
  FOR DELETE 
  USING (user_id = auth.uid());
