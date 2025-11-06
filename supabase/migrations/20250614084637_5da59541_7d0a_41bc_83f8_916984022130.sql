
-- Clean up duplicate and stale join requests
-- First, delete any join requests for users who are already members of the group
DELETE FROM public.group_join_requests 
WHERE (group_id, user_id) IN (
  SELECT gjr.group_id, gjr.user_id 
  FROM public.group_join_requests gjr
  JOIN public.group_members gm ON gjr.group_id = gm.group_id AND gjr.user_id = gm.user_id
);

-- Delete old pending join requests (older than 30 days) to clean up stale data
DELETE FROM public.group_join_requests 
WHERE status = 'pending' AND requested_at < NOW() - INTERVAL '30 days';

-- For any remaining duplicates, keep only the most recent one
DELETE FROM public.group_join_requests 
WHERE id NOT IN (
  SELECT DISTINCT ON (group_id, user_id) id
  FROM public.group_join_requests 
  ORDER BY group_id, user_id, requested_at DESC
);
