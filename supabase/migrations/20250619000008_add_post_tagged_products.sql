-- Create table for tagged products in posts
CREATE TABLE IF NOT EXISTS public.post_tagged_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(post_id, product_id)
);

-- Enable RLS
ALTER TABLE public.post_tagged_products ENABLE ROW LEVEL SECURITY;

-- RLS Policies for post_tagged_products
CREATE POLICY "Users can view tagged products for posts they can see" ON public.post_tagged_products
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_tagged_products.post_id
      AND (
        p.privacy = 'public' OR
        p.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.user_follows uf
          WHERE uf.follower_id = auth.uid()
          AND uf.following_id = p.user_id
        )
      )
    )
  );

CREATE POLICY "Users can insert tagged products for their own posts" ON public.post_tagged_products
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_tagged_products.post_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tagged products from their own posts" ON public.post_tagged_products
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.id = post_tagged_products.post_id
      AND p.user_id = auth.uid()
    )
  ); 