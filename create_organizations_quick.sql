-- EXECUTE THIS SCRIPT IN SUPABASE SQL EDITOR
-- This will create the organizations system quickly

-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  logo_url TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  admin_percentage DECIMAL(5,2) DEFAULT 10.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add organization fields to profiles table (if not exists)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='organization_role') THEN
    ALTER TABLE profiles ADD COLUMN organization_role VARCHAR(50) DEFAULT 'user';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='organization_id') THEN
    ALTER TABLE profiles ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Add organization fields to campaigns table (if not exists)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='organization_id') THEN
    ALTER TABLE campaigns ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='campaigns' AND column_name='organization_percentage') THEN
    ALTER TABLE campaigns ADD COLUMN organization_percentage DECIMAL(5,2) DEFAULT 0.00;
  END IF;
END $$;

-- 4. Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 5. Create basic RLS policies
CREATE POLICY IF NOT EXISTS "Organizations are viewable by everyone" ON organizations
  FOR SELECT USING (is_active = true);

CREATE POLICY IF NOT EXISTS "Organizations can be managed by admins" ON organizations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'admin' OR profiles.organization_role = 'admin')
    )
  );

-- 6. Insert default admin organization
INSERT INTO organizations (name, description, admin_percentage, is_active)
VALUES ('Photo Arena Admin', 'Organização administrativa principal', 10.00, true)
ON CONFLICT DO NOTHING;

-- 7. Update existing admin profiles
UPDATE profiles 
SET organization_role = 'admin'
WHERE role = 'admin' AND (organization_role IS NULL OR organization_role != 'admin');

-- 8. Update existing photographer profiles
UPDATE profiles 
SET organization_role = 'photographer'
WHERE role = 'photographer' AND (organization_role IS NULL OR organization_role != 'photographer');

-- 9. Update existing regular users
UPDATE profiles 
SET organization_role = 'user'
WHERE role = 'user' AND (organization_role IS NULL OR organization_role != 'user');

-- Success message
SELECT 'Organizations system created successfully!' as status;