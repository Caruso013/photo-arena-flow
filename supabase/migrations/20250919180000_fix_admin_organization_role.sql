-- Fix existing admin users to have organization_role = 'admin'
UPDATE profiles 
SET organization_role = 'admin'
WHERE role = 'admin' AND (organization_role IS NULL OR organization_role != 'admin');

-- Ensure all users have a proper organization_role based on their role
UPDATE profiles 
SET organization_role = CASE 
  WHEN role = 'admin' THEN 'admin'
  WHEN role = 'photographer' THEN 'photographer'
  ELSE 'user'
END
WHERE organization_role IS NULL;

COMMENT ON COLUMN profiles.organization_role IS 'Role within organization structure: admin, organization, photographer, user';