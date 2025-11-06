-- Fix the follows table consistency issue
-- The problem is that we have two different follows tables with different references
-- We need to ensure all components use the same table

-- First, let's check which table is actually being used by the components
-- Based on the code analysis, components are using 'public.follows' 
-- But functions are using 'public.user_follows'

-- Let's update the functions to use the correct table
DROP FUNCTION IF EXISTS public.get_follower_count(UUID);
CREATE OR REPLACE FUNCTION public.get_follower_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*) FROM public.follows WHERE following_id = user_uuid;
$$;

DROP FUNCTION IF EXISTS public.get_following_count(UUID);
CREATE OR REPLACE FUNCTION public.get_following_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*) FROM public.follows WHERE follower_id = user_uuid;
$$;

DROP FUNCTION IF EXISTS public.is_following(UUID, UUID);
CREATE OR REPLACE FUNCTION public.is_following(follower_uuid UUID, following_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS(SELECT 1 FROM public.follows WHERE follower_id = follower_uuid AND following_id = following_uuid);
$$;

-- Update the RLS policy to ensure it's using the correct table
-- The RLS policy should already be correct since we fixed it in the previous migration
-- But let's make sure it's properly applied

-- Drop and recreate the policy to ensure it's using the right table
DROP POLICY IF EXISTS "Users can view posts based on privacy" ON public.posts;

CREATE POLICY "Users can view posts based on privacy" ON public.posts
    FOR SELECT USING (
        privacy = 'public' OR
        (privacy = 'following' AND (
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.follows 
                WHERE follower_id = auth.uid() 
                AND following_id = posts.user_id
            )
        )) OR
        user_id = auth.uid()
    ); 