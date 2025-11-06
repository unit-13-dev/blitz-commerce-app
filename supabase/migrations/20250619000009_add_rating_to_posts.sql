-- Add rating column to posts table for review posts
ALTER TABLE public.posts ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 5);

-- Remove old review system tables
DROP TABLE IF EXISTS public.product_reviews CASCADE;
DROP TABLE IF EXISTS public.review_responses CASCADE;

-- Update RLS policies to include rating
DROP POLICY IF EXISTS "Users can view posts based on privacy" ON public.posts;
CREATE POLICY "Users can view posts based on privacy" ON public.posts
  FOR SELECT USING (
    privacy = 'public' OR
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_follows uf
      WHERE uf.follower_id = auth.uid()
      AND uf.following_id = posts.user_id
    )
  );

DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;
CREATE POLICY "Users can insert their own posts" ON public.posts
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
CREATE POLICY "Users can update their own posts" ON public.posts
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
CREATE POLICY "Users can delete their own posts" ON public.posts
  FOR DELETE USING (user_id = auth.uid()); 