
-- Insert admin profile with the specified credentials
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
  id,
  'arpitdogra033@gmail.com',
  'Admin User',
  'admin'
FROM auth.users 
WHERE email = 'arpitdogra033@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- If the user doesn't exist in auth.users yet, we'll handle it in the signup process
-- Update any existing user with that email to admin role
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'arpitdogra033@gmail.com';
