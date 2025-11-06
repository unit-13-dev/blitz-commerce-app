-- Add access code functionality to groups table
ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS access_code TEXT,
ADD COLUMN IF NOT EXISTS code_generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create unique index on access_code to ensure uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS unique_access_code 
ON public.groups(access_code) 
WHERE access_code IS NOT NULL;

-- Create function to generate 8-digit alphanumeric access code
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  i INTEGER;
BEGIN
  -- Generate 8-character alphanumeric code
  code := '';
  FOR i IN 1..8 LOOP
    code := code || substr(chars, floor(random() * length(chars))::integer + 1, 1);
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Create function to generate unique access code
CREATE OR REPLACE FUNCTION generate_unique_access_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  attempts INTEGER := 0;
  max_attempts INTEGER := 10;
BEGIN
  LOOP
    new_code := generate_access_code();
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM public.groups WHERE access_code = new_code) THEN
      RETURN new_code;
    END IF;
    
    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique access code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Update RLS policies for private groups
-- Private groups should only be visible to members and creators
DROP POLICY IF EXISTS "Anyone can view groups" ON public.groups;
CREATE POLICY "Public groups are viewable by everyone" ON public.groups
FOR SELECT USING (NOT is_private);

CREATE POLICY "Private groups are viewable by members and creators" ON public.groups
FOR SELECT USING (
  is_private AND (
    auth.uid() = creator_id OR 
    auth.uid() IN (
      SELECT user_id FROM public.group_members WHERE group_id = id
    )
  )
);

-- Update insert policy to generate access code for private groups
CREATE OR REPLACE FUNCTION handle_private_group_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate access code for private groups
  IF NEW.is_private = true AND NEW.access_code IS NULL THEN
    NEW.access_code := generate_unique_access_code();
    NEW.code_generated_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic access code generation
CREATE TRIGGER handle_private_group_creation_trigger
  BEFORE INSERT ON public.groups
  FOR EACH ROW EXECUTE FUNCTION handle_private_group_creation(); 