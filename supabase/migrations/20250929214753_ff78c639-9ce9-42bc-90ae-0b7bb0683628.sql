-- Fix infinite recursion in organization_members policies
-- Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Organization owners can view members" ON public.organization_members;

-- Recreate it using the security definer function instead
CREATE POLICY "Organization owners can view members"
ON public.organization_members
FOR SELECT
USING (public.is_organization_owner(auth.uid(), organization_id));

COMMENT ON POLICY "Organization owners can view members" ON public.organization_members IS 
'Organization owners can view all members of their organizations';