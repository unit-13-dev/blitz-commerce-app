
-- First, let's clean up any existing duplicate or stale join requests
-- and ensure proper constraints are in place

-- Clean up any join requests for users who are already members
DELETE FROM public.group_join_requests 
WHERE (group_id, user_id) IN (
  SELECT gjr.group_id, gjr.user_id 
  FROM public.group_join_requests gjr
  JOIN public.group_members gm ON gjr.group_id = gm.group_id AND gjr.user_id = gm.user_id
);

-- Clean up old rejected/expired requests (older than 7 days)
DELETE FROM public.group_join_requests 
WHERE status IN ('rejected', 'expired') 
AND requested_at < NOW() - INTERVAL '7 days';

-- Ensure we have the unique constraint (should already exist but let's be sure)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'group_join_requests_group_id_user_id_key'
    ) THEN
        ALTER TABLE public.group_join_requests 
        ADD CONSTRAINT group_join_requests_group_id_user_id_key 
        UNIQUE (group_id, user_id);
    END IF;
END $$;

-- Add proper RLS policies for group_join_requests if they don't exist
DO $$
BEGIN
    -- Check if policies exist and create them if they don't
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'group_join_requests' 
        AND policyname = 'view_own_join_requests'
    ) THEN
        CREATE POLICY "view_own_join_requests" 
        ON public.group_join_requests 
        FOR SELECT 
        USING (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'group_join_requests' 
        AND policyname = 'create_own_join_requests'
    ) THEN
        CREATE POLICY "create_own_join_requests" 
        ON public.group_join_requests 
        FOR INSERT 
        WITH CHECK (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'group_join_requests' 
        AND policyname = 'creators_view_group_requests'
    ) THEN
        CREATE POLICY "creators_view_group_requests" 
        ON public.group_join_requests 
        FOR SELECT 
        USING (public.is_group_creator(group_id));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'group_join_requests' 
        AND policyname = 'creators_update_group_requests'
    ) THEN
        CREATE POLICY "creators_update_group_requests" 
        ON public.group_join_requests 
        FOR UPDATE 
        USING (public.is_group_creator(group_id));
    END IF;
END $$;

-- Enable RLS on group_join_requests if not already enabled
ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;
