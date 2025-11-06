
-- Add foreign key constraints for better data integrity
ALTER TABLE public.groups 
ADD CONSTRAINT fk_groups_creator 
FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.groups 
ADD CONSTRAINT fk_groups_product 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.group_members 
ADD CONSTRAINT fk_group_members_group 
FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;

ALTER TABLE public.group_members 
ADD CONSTRAINT fk_group_members_user 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add RLS policies for groups
CREATE POLICY "Anyone can view groups" ON public.groups
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create groups" ON public.groups
FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Group creators can update their groups" ON public.groups
FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Group creators can delete their groups" ON public.groups
FOR DELETE USING (auth.uid() = creator_id);

-- Add RLS policies for group members
CREATE POLICY "Anyone can view group members" ON public.group_members
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can join groups" ON public.group_members
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave groups" ON public.group_members
FOR DELETE USING (auth.uid() = user_id);

-- Create wishlist table
CREATE TABLE public.wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS on wishlist
ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for wishlist
CREATE POLICY "Users can view their own wishlist" ON public.wishlist
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their wishlist" ON public.wishlist
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from their wishlist" ON public.wishlist
FOR DELETE USING (auth.uid() = user_id);

-- Add views count to posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- Add business_name to vendor_kyc for display purposes
ALTER TABLE public.vendor_kyc ADD COLUMN IF NOT EXISTS display_business_name TEXT;

-- Create post views tracking table
CREATE TABLE public.post_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ip_address INET,
  UNIQUE(post_id, user_id)
);

-- Enable RLS on post views
ALTER TABLE public.post_views ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for post views
CREATE POLICY "Anyone can view post views" ON public.post_views
FOR SELECT USING (true);

CREATE POLICY "Anyone can record post views" ON public.post_views
FOR INSERT WITH CHECK (true);

-- Make aadhar_number required in vendor_kyc
ALTER TABLE public.vendor_kyc ALTER COLUMN aadhar_number SET NOT NULL;

-- Add triggers to update post counts
CREATE OR REPLACE FUNCTION update_post_views_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET views_count = views_count + 1 WHERE id = NEW.post_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_views_count_trigger
  AFTER INSERT ON public.post_views
  FOR EACH ROW EXECUTE FUNCTION update_post_views_count();
