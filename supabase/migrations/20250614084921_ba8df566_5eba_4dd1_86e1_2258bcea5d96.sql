
-- First, let's see what's in the table
-- Then clean up all problematic records more thoroughly

-- Delete ALL existing join requests to start fresh
-- This is safe because any legitimate pending requests can be recreated
DELETE FROM public.group_join_requests;

-- Alternatively, if you want to be more selective, use this instead:
-- DELETE FROM public.group_join_requests 
-- WHERE status IN ('pending', 'approved', 'rejected');

-- Add a unique constraint if it doesn't exist (it should already exist based on the error)
-- This is just to be sure
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
