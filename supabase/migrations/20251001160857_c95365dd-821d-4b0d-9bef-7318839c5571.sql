-- CRITICAL SECURITY FIX: Remove public access to user emails
-- Drop the insecure public SELECT policy on profiles
DROP POLICY IF EXISTS "Public profile info viewable" ON public.profiles;

-- Create a secure view for public profile data (without emails)
DROP VIEW IF EXISTS public.public_profiles;
CREATE VIEW public.public_profiles AS
SELECT 
  id,
  full_name,
  avatar_url,
  role,
  created_at
FROM public.profiles;

-- Grant SELECT on the view
GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- Add comment for documentation
COMMENT ON VIEW public.public_profiles IS 'Public view of user profiles without sensitive data like emails';

-- Ensure only authenticated users can view full profiles
DROP POLICY IF EXISTS "Authenticated users view basic profiles" ON public.profiles;
CREATE POLICY "Authenticated users view basic profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);