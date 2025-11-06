-- Fix the RLS policy for post privacy to use the correct follows table
-- Drop the existing policy and recreate it with the correct table reference

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