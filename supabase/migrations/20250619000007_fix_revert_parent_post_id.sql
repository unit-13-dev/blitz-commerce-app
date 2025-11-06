-- Drop the RLS policies for comments first
DROP POLICY IF EXISTS "Users can view comments on posts they can see" ON public.posts;
DROP POLICY IF EXISTS "Users can create comments on posts they can see" ON public.posts;

-- Now drop the parent_post_id column
ALTER TABLE public.posts DROP COLUMN IF EXISTS parent_post_id;

-- Drop the index if it exists
DROP INDEX IF EXISTS idx_posts_parent_post_id; 