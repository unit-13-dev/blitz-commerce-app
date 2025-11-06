
-- Create follows table for user-to-user following relationships
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Add follower/following counts to profiles table (only if columns don't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'followers_count') THEN
        ALTER TABLE public.profiles ADD COLUMN followers_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'following_count') THEN
        ALTER TABLE public.profiles ADD COLUMN following_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'posts_count') THEN
        ALTER TABLE public.profiles ADD COLUMN posts_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio') THEN
        ALTER TABLE public.profiles ADD COLUMN bio TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'website') THEN
        ALTER TABLE public.profiles ADD COLUMN website TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'location') THEN
        ALTER TABLE public.profiles ADD COLUMN location TEXT;
    END IF;
END $$;

-- Enable RLS on follows table
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- RLS policies for follows table
DO $$
BEGIN
    -- Users can view all follow relationships (public information)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'follows' 
        AND policyname = 'Anyone can view follows'
    ) THEN
        CREATE POLICY "Anyone can view follows" 
        ON public.follows 
        FOR SELECT 
        USING (true);
    END IF;

    -- Users can create follow relationships where they are the follower
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'follows' 
        AND policyname = 'Users can follow others'
    ) THEN
        CREATE POLICY "Users can follow others" 
        ON public.follows 
        FOR INSERT 
        WITH CHECK (auth.uid() = follower_id);
    END IF;

    -- Users can delete follow relationships where they are the follower (unfollow)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'follows' 
        AND policyname = 'Users can unfollow others'
    ) THEN
        CREATE POLICY "Users can unfollow others" 
        ON public.follows 
        FOR DELETE 
        USING (auth.uid() = follower_id);
    END IF;
END $$;

-- Create function to update follow counts
CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increase follower count for the user being followed
    UPDATE public.profiles 
    SET followers_count = followers_count + 1 
    WHERE id = NEW.following_id;
    
    -- Increase following count for the user doing the following
    UPDATE public.profiles 
    SET following_count = following_count + 1 
    WHERE id = NEW.follower_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrease follower count for the user being unfollowed
    UPDATE public.profiles 
    SET followers_count = followers_count - 1 
    WHERE id = OLD.following_id;
    
    -- Decrease following count for the user doing the unfollowing
    UPDATE public.profiles 
    SET following_count = following_count - 1 
    WHERE id = OLD.follower_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create triggers for follow counts (drop first to avoid conflicts)
DROP TRIGGER IF EXISTS update_follow_counts_trigger ON public.follows;
CREATE TRIGGER update_follow_counts_trigger
  AFTER INSERT OR DELETE ON public.follows
  FOR EACH ROW EXECUTE FUNCTION public.update_follow_counts();

-- Update existing posts count function to also update profiles
CREATE OR REPLACE FUNCTION public.update_profile_posts_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles 
    SET posts_count = posts_count + 1 
    WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles 
    SET posts_count = posts_count - 1 
    WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for posts count (drop first to avoid conflicts)
DROP TRIGGER IF EXISTS update_profile_posts_count_trigger ON public.posts;
CREATE TRIGGER update_profile_posts_count_trigger
  AFTER INSERT OR DELETE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_posts_count();

-- Initialize existing users' post counts
UPDATE public.profiles 
SET posts_count = (
  SELECT COUNT(*) 
  FROM public.posts 
  WHERE posts.user_id = profiles.id
)
WHERE posts_count = 0;
