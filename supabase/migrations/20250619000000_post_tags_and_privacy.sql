-- Add post tags table
CREATE TABLE IF NOT EXISTS public.post_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default post tags
INSERT INTO public.post_tags (name) VALUES 
    ('review'),
    ('tutorial'),
    ('unboxing'),
    ('question'),
    ('announcement')
ON CONFLICT (name) DO NOTHING;

-- Add post_tag_mappings table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.post_tag_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.post_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, tag_id)
);

-- Add privacy and status columns to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS privacy VARCHAR(20) DEFAULT 'public' CHECK (privacy IN ('public', 'following', 'draft')),
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published' CHECK (status IN ('published', 'draft'));

-- Create drafts table
CREATE TABLE IF NOT EXISTS public.drafts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT,
    feeling VARCHAR(50),
    privacy VARCHAR(20) DEFAULT 'public' CHECK (privacy IN ('public', 'following', 'draft')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for new tables
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tag_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;

-- Post tags policies (anyone can view)
CREATE POLICY "Anyone can view post tags" ON public.post_tags
    FOR SELECT USING (true);

-- Post tag mappings policies
CREATE POLICY "Anyone can view post tag mappings" ON public.post_tag_mappings
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own post tag mappings" ON public.post_tag_mappings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.posts 
            WHERE posts.id = post_tag_mappings.post_id 
            AND posts.user_id = auth.uid()
        )
    );

-- Drafts policies
CREATE POLICY "Users can view their own drafts" ON public.drafts
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own drafts" ON public.drafts
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own drafts" ON public.drafts
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own drafts" ON public.drafts
    FOR DELETE USING (user_id = auth.uid());

-- Update posts RLS to handle privacy
DROP POLICY IF EXISTS "Users can view all posts" ON public.posts;
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_tag_mappings_post_id ON public.post_tag_mappings(post_id);
CREATE INDEX IF NOT EXISTS idx_post_tag_mappings_tag_id ON public.post_tag_mappings(tag_id);
CREATE INDEX IF NOT EXISTS idx_drafts_user_id ON public.drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_privacy ON public.posts(privacy);
CREATE INDEX IF NOT EXISTS idx_posts_status ON public.posts(status); 