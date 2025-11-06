-- Add parent_post_id column to posts table for nested comments
ALTER TABLE public.posts 
ADD COLUMN parent_post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE;

-- Add index for better performance when querying comments
CREATE INDEX IF NOT EXISTS idx_posts_parent_post_id ON public.posts(parent_post_id);

-- Update RLS policy to allow reading comments
CREATE POLICY "Users can view comments on posts they can see" ON public.posts
FOR SELECT USING (
  parent_post_id IS NOT NULL AND (
    -- Public posts
    EXISTS (
      SELECT 1 FROM public.posts parent 
      WHERE parent.id = posts.parent_post_id 
      AND parent.privacy = 'public'
    )
    OR
    -- Following posts (user follows the post creator)
    EXISTS (
      SELECT 1 FROM public.posts parent 
      JOIN public.user_follows uf ON parent.user_id = uf.following_id 
      WHERE parent.id = posts.parent_post_id 
      AND parent.privacy = 'following'
      AND uf.follower_id = auth.uid()
    )
    OR
    -- Own posts
    EXISTS (
      SELECT 1 FROM public.posts parent 
      WHERE parent.id = posts.parent_post_id 
      AND parent.user_id = auth.uid()
    )
  )
);

-- Allow users to create comments on posts they can see
CREATE POLICY "Users can create comments on posts they can see" ON public.posts
FOR INSERT WITH CHECK (
  parent_post_id IS NOT NULL AND (
    -- Public posts
    EXISTS (
      SELECT 1 FROM public.posts parent 
      WHERE parent.id = posts.parent_post_id 
      AND parent.privacy = 'public'
    )
    OR
    -- Following posts (user follows the post creator)
    EXISTS (
      SELECT 1 FROM public.posts parent 
      JOIN public.user_follows uf ON parent.user_id = uf.following_id 
      WHERE parent.id = posts.parent_post_id 
      AND parent.privacy = 'following'
      AND uf.follower_id = auth.uid()
    )
    OR
    -- Own posts
    EXISTS (
      SELECT 1 FROM public.posts parent 
      WHERE parent.id = posts.parent_post_id 
      AND parent.user_id = auth.uid()
    )
  )
  AND user_id = auth.uid()
); 