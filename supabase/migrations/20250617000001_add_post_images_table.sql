-- Create post_images table for multiple post images
CREATE TABLE public.post_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_post_images_post_id ON public.post_images(post_id);
CREATE INDEX idx_post_images_display_order ON public.post_images(display_order);

-- Enable RLS on post_images table
ALTER TABLE public.post_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_images
CREATE POLICY "Post images are viewable by everyone" ON public.post_images FOR SELECT USING (true);
CREATE POLICY "Users can manage own post images" ON public.post_images FOR ALL USING (
  auth.uid() IN (
    SELECT user_id FROM public.posts WHERE id = post_id
  )
);
CREATE POLICY "Admins can manage all post images" ON public.post_images FOR ALL USING (
  get_user_role(auth.uid()) = 'admin'
);

-- Create function to update updated_at column (if not already exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for post_images updated_at
CREATE TRIGGER update_post_images_updated_at 
  BEFORE UPDATE ON public.post_images 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 