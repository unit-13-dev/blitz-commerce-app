
-- Add invite functionality to groups
CREATE TABLE IF NOT EXISTS public.group_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  invited_by UUID NOT NULL,
  invited_email TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on group_invites
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

-- Policies for group_invites
CREATE POLICY "Group creators can manage invites" 
  ON public.group_invites 
  FOR ALL 
  USING (public.is_group_creator(group_id));

CREATE POLICY "Users can view invites sent to them" 
  ON public.group_invites 
  FOR SELECT 
  USING (invited_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Add invite_only column to groups table
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS invite_only BOOLEAN DEFAULT false;

-- Update group_join_requests to include invite_code reference
ALTER TABLE public.group_join_requests ADD COLUMN IF NOT EXISTS invite_code TEXT;
