-- Fix: Remove duplicate RLS policies on profiles table that cause 500 error
-- The PIX migration created duplicate policies for SELECT and UPDATE

-- Remove duplicate policies created by PIX migration
DROP POLICY IF EXISTS "Photographers can view own pix data" ON public.profiles;
DROP POLICY IF EXISTS "Photographers can update own pix data" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all pix data" ON public.profiles;

-- Verify existing policies work correctly
-- The following policies should already exist and handle all cases:
-- - "Users can view all profiles" or similar for SELECT
-- - "Users can update own profile" for UPDATE

-- Ensure the basic update policy exists (this is safe, it won't duplicate)
DO $$
BEGIN
  -- Check if update policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    -- Create the policy if it doesn't exist
    CREATE POLICY "Users can update own profile" 
    ON public.profiles
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Grant necessary permissions
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
