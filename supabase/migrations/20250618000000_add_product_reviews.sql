-- Create product_reviews table
CREATE TABLE public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, user_id) -- One review per user per product
);

-- Create review_responses table for vendor responses
CREATE TABLE public.review_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID REFERENCES public.product_reviews(id) ON DELETE CASCADE NOT NULL,
  vendor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  response_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX idx_product_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX idx_product_reviews_rating ON public.product_reviews(rating);
CREATE INDEX idx_product_reviews_created_at ON public.product_reviews(created_at);
CREATE INDEX idx_review_responses_review_id ON public.review_responses(review_id);

-- Create RLS policies for product_reviews
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Allow users to read all reviews
CREATE POLICY "Allow users to read all reviews" ON public.product_reviews
  FOR SELECT USING (true);

-- Allow authenticated users to create reviews
CREATE POLICY "Allow authenticated users to create reviews" ON public.product_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own reviews (for future use)
CREATE POLICY "Allow users to update their own reviews" ON public.product_reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to delete their own reviews (for future use)
CREATE POLICY "Allow users to delete their own reviews" ON public.product_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for review_responses
ALTER TABLE public.review_responses ENABLE ROW LEVEL SECURITY;

-- Allow users to read all responses
CREATE POLICY "Allow users to read all responses" ON public.review_responses
  FOR SELECT USING (true);

-- Allow vendors to create responses to reviews of their products
CREATE POLICY "Allow vendors to create responses" ON public.review_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.product_reviews pr
      JOIN public.products p ON pr.product_id = p.id
      WHERE pr.id = review_id AND p.vendor_id = auth.uid()
    )
  );

-- Allow vendors to update their own responses
CREATE POLICY "Allow vendors to update their own responses" ON public.review_responses
  FOR UPDATE USING (auth.uid() = vendor_id);

-- Allow vendors to delete their own responses
CREATE POLICY "Allow vendors to delete their own responses" ON public.review_responses
  FOR DELETE USING (auth.uid() = vendor_id);

-- Create function to get average rating for a product
CREATE OR REPLACE FUNCTION public.get_product_average_rating(product_uuid UUID)
RETURNS DECIMAL(3,2)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT COALESCE(AVG(rating), 0.00)
  FROM public.product_reviews
  WHERE product_id = product_uuid;
$$;

-- Create function to get review count for a product
CREATE OR REPLACE FUNCTION public.get_product_review_count(product_uuid UUID)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT COALESCE(COUNT(*), 0)
  FROM public.product_reviews
  WHERE product_id = product_uuid;
$$; 