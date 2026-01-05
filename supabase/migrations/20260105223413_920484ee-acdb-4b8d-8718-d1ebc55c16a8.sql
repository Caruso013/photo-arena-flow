-- Fix: avoid infinite recursion in RLS policies that call has_role() (which reads from profiles)
-- By turning off row security inside the SECURITY DEFINER function.

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id AND role = _role
  );
$$;

COMMENT ON FUNCTION public.has_role(uuid, user_role)
IS 'Checks whether a user has a given role. row_security is disabled to avoid RLS recursion when used inside policies.';