-- Create order_participants table for group orders
-- This table tracks individual participant details for group orders

-- Create order_participants table
CREATE TABLE IF NOT EXISTS public.order_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  final_price DECIMAL(10,2) NOT NULL,
  shipping_address_id UUID REFERENCES public.user_addresses(id),
  shipping_address_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_order_participants_order_id ON public.order_participants(order_id);
CREATE INDEX IF NOT EXISTS idx_order_participants_user_id ON public.order_participants(user_id);

-- Enable Row Level Security
ALTER TABLE public.order_participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own order participants" ON public.order_participants;
DROP POLICY IF EXISTS "System can manage order participants" ON public.order_participants;

-- Create RLS policies for order_participants
CREATE POLICY "Users can view own order participants" ON public.order_participants
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() IN (
      SELECT user_id FROM public.orders WHERE id = order_id
    )
  );

CREATE POLICY "System can manage order participants" ON public.order_participants
  FOR ALL USING (true);

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_order_participants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_order_participants_updated_at_trigger
  BEFORE UPDATE ON public.order_participants
  FOR EACH ROW EXECUTE FUNCTION update_order_participants_updated_at(); 