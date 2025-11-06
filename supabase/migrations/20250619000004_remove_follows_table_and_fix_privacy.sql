-- Remove the public.follows table and fix all references to use user_follows
-- The public.follows table references auth.users but user_follows references profiles
-- Since profiles.id = auth.users.id, we should use user_follows consistently

-- First, drop the public.follows table
DROP TABLE IF EXISTS public.follows CASCADE;

-- Update the functions to use user_follows table
DROP FUNCTION IF EXISTS public.get_follower_count(UUID);
CREATE OR REPLACE FUNCTION public.get_follower_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*) FROM public.user_follows WHERE following_id = user_uuid;
$$;

DROP FUNCTION IF EXISTS public.get_following_count(UUID);
CREATE OR REPLACE FUNCTION public.get_following_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*) FROM public.user_follows WHERE follower_id = user_uuid;
$$;

DROP FUNCTION IF EXISTS public.is_following(UUID, UUID);
CREATE OR REPLACE FUNCTION public.is_following(follower_uuid UUID, following_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_follows WHERE follower_id = follower_uuid AND following_id = following_uuid);
$$;

-- Update the RLS policy to use user_follows table
DROP POLICY IF EXISTS "Users can view posts based on privacy" ON public.posts;

CREATE POLICY "Users can view posts based on privacy" ON public.posts
    FOR SELECT USING (
        privacy = 'public' OR
        (privacy = 'following' AND (
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM public.user_follows 
                WHERE follower_id = auth.uid() 
                AND following_id = posts.user_id
            )
        )) OR
        user_id = auth.uid()
    ); 