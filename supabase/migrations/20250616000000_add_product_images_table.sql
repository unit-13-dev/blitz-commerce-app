-- Create product_images table for multiple product images
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);
CREATE INDEX idx_product_images_display_order ON public.product_images(display_order);
CREATE INDEX idx_product_images_primary ON public.product_images(is_primary);

-- Enable RLS on product_images table
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_images
CREATE POLICY "Product images are viewable by everyone" ON public.product_images FOR SELECT USING (true);
CREATE POLICY "Vendors can manage own product images" ON public.product_images FOR ALL USING (
  auth.uid() IN (
    SELECT vendor_id FROM public.products WHERE id = product_id
  )
);
CREATE POLICY "Admins can manage all product images" ON public.product_images FOR ALL USING (
  get_user_role(auth.uid()) = 'admin'
);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for product_images updated_at
CREATE TRIGGER update_product_images_updated_at 
  BEFORE UPDATE ON public.product_images 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add constraint to ensure only one primary image per product
CREATE UNIQUE INDEX idx_product_images_primary_per_product 
  ON public.product_images(product_id) 
  WHERE is_primary = true;

-- Function to set primary image
CREATE OR REPLACE FUNCTION set_primary_product_image(product_uuid UUID, image_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Remove primary flag from all other images for this product
  UPDATE public.product_images 
  SET is_primary = false 
  WHERE product_id = product_uuid;
  
  -- Set the specified image as primary
  UPDATE public.product_images 
  SET is_primary = true 
  WHERE id = image_uuid AND product_id = product_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 