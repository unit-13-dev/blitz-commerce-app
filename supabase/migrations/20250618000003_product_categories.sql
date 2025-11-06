-- Create product_categories table
CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create product_category_mappings table for many-to-many relationship
CREATE TABLE public.product_category_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.product_categories(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, category_id)
);

-- Create indexes for better performance
CREATE INDEX idx_product_category_mappings_product_id ON public.product_category_mappings(product_id);
CREATE INDEX idx_product_category_mappings_category_id ON public.product_category_mappings(category_id);

-- Enable Row Level Security
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_category_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_categories
CREATE POLICY "Anyone can view product categories" ON public.product_categories FOR SELECT USING (true);
CREATE POLICY "Only admins can insert product categories" ON public.product_categories FOR INSERT WITH CHECK (auth.role() = 'admin');
CREATE POLICY "Only admins can update product categories" ON public.product_categories FOR UPDATE USING (auth.role() = 'admin');
CREATE POLICY "Only admins can delete product categories" ON public.product_categories FOR DELETE USING (auth.role() = 'admin');

-- RLS Policies for product_category_mappings
CREATE POLICY "Anyone can view product category mappings" ON public.product_category_mappings FOR SELECT USING (true);
CREATE POLICY "Vendors can manage their own product category mappings" ON public.product_category_mappings FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.products 
    WHERE products.id = product_category_mappings.product_id 
    AND products.vendor_id = auth.uid()
  )
);

-- Insert default categories
INSERT INTO public.product_categories (name) VALUES
  ('Others'),
  ('Kurtas & Suits'),
  ('Kurtis, Tunics & Tops'),
  ('Sarees'),
  ('Ethnic Wear'),
  ('Leggings, Salwars & Churidars'),
  ('Lehanga Cholis'),
  ('Dress Materials'),
  ('Dupattas'),
  ('Dresses'),
  ('Tops'),
  ('Tshirts'),
  ('Jeans'),
  ('Trousers & Capris'),
  ('Shorts & Skirts'),
  ('Co-ords');

-- Function to get product categories
CREATE OR REPLACE FUNCTION public.get_product_categories(product_uuid UUID)
RETURNS TABLE(category_name TEXT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT pc.name
  FROM public.product_categories pc
  INNER JOIN public.product_category_mappings pcm ON pc.id = pcm.category_id
  WHERE pcm.product_id = product_uuid
  ORDER BY pc.name;
$$; 