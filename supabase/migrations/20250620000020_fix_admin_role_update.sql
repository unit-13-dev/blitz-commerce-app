-- Fix admin role update functionality
-- Add RLS policy to allow admins to update user roles

-- Drop existing update policy for profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create new policies that allow both users to update their own profile and admins to update any profile
CREATE POLICY "Users can update own profile" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile" ON public.profiles 
  FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');

-- Also add a policy for admins to view all profiles (for the admin dashboard)
CREATE POLICY "Admins can view all profiles" ON public.profiles 
  FOR SELECT USING (get_user_role(auth.uid()) = 'admin');

-- Add a policy for admins to delete profiles (for user management)
CREATE POLICY "Admins can delete profiles" ON public.profiles 
  FOR DELETE USING (get_user_role(auth.uid()) = 'admin'); 