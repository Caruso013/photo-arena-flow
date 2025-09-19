-- Create organizations table
CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  logo_url TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  admin_percentage DECIMAL(5,2) DEFAULT 0.00, -- Percentage that admin takes from organization
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create organization_members table (linking users to organizations)
CREATE TABLE organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  photographer_percentage DECIMAL(5,2) DEFAULT 0.00, -- Percentage that photographer gets
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Add organization fields to profiles table
ALTER TABLE profiles ADD COLUMN organization_role VARCHAR(50) DEFAULT 'user'; -- 'admin', 'organization', 'photographer', 'user'
ALTER TABLE profiles ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Add organization reference to campaigns table
ALTER TABLE campaigns ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE campaigns ADD COLUMN organization_percentage DECIMAL(5,2) DEFAULT 0.00; -- Percentage organization takes

-- Create event applications table (for photographers to apply to events)
CREATE TABLE event_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  photographer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  photographer_percentage DECIMAL(5,2) DEFAULT 0.00, -- Percentage photographer will receive
  application_message TEXT,
  response_message TEXT,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(campaign_id, photographer_id)
);

-- Create revenue sharing table for tracking payments
CREATE TABLE revenue_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  photographer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_amount DECIMAL(10,2) DEFAULT 0.00,
  organization_amount DECIMAL(10,2) DEFAULT 0.00,
  photographer_amount DECIMAL(10,2) DEFAULT 0.00,
  total_amount DECIMAL(10,2) NOT NULL,
  admin_percentage DECIMAL(5,2) DEFAULT 0.00,
  organization_percentage DECIMAL(5,2) DEFAULT 0.00,
  photographer_percentage DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Organizations are viewable by everyone" ON organizations
  FOR SELECT USING (is_active = true);

CREATE POLICY "Organizations can be managed by admins" ON organizations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_role = 'admin'
    )
  );

CREATE POLICY "Organizations can be updated by organization owners" ON organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_members.organization_id = organizations.id 
      AND organization_members.user_id = auth.uid() 
      AND organization_members.role = 'owner'
    )
  );

-- RLS Policies for organization_members
CREATE POLICY "Organization members are viewable by organization members" ON organization_members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    ) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_role = 'admin'
    )
  );

CREATE POLICY "Organization members can be managed by organization owners/admins" ON organization_members
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_role = 'admin'
    )
  );

-- RLS Policies for event_applications
CREATE POLICY "Event applications are viewable by related users" ON event_applications
  FOR SELECT USING (
    photographer_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_role = 'admin'
    )
  );

CREATE POLICY "Photographers can create applications" ON event_applications
  FOR INSERT WITH CHECK (
    photographer_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_role = 'photographer'
    )
  );

CREATE POLICY "Organizations can manage applications for their events" ON event_applications
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_role = 'admin'
    )
  );

-- RLS Policies for revenue_shares
CREATE POLICY "Revenue shares are viewable by related users" ON revenue_shares
  FOR SELECT USING (
    photographer_id = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND is_active = true
    ) OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.organization_role = 'admin'
    )
  );

CREATE POLICY "Revenue shares can be created by system" ON revenue_shares
  FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_organization_members_org_user ON organization_members(organization_id, user_id);
CREATE INDEX idx_organization_members_user ON organization_members(user_id);
CREATE INDEX idx_event_applications_campaign ON event_applications(campaign_id);
CREATE INDEX idx_event_applications_photographer ON event_applications(photographer_id);
CREATE INDEX idx_event_applications_organization ON event_applications(organization_id);
CREATE INDEX idx_revenue_shares_purchase ON revenue_shares(purchase_id);
CREATE INDEX idx_revenue_shares_campaign ON revenue_shares(campaign_id);
CREATE INDEX idx_profiles_organization_role ON profiles(organization_role);
CREATE INDEX idx_profiles_organization_id ON profiles(organization_id);

-- Create functions for revenue calculation
CREATE OR REPLACE FUNCTION calculate_revenue_share(
  purchase_amount DECIMAL(10,2),
  admin_pct DECIMAL(5,2),
  org_pct DECIMAL(5,2),
  photographer_pct DECIMAL(5,2)
)
RETURNS TABLE (
  admin_amount DECIMAL(10,2),
  organization_amount DECIMAL(10,2),
  photographer_amount DECIMAL(10,2)
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY SELECT
    ROUND(purchase_amount * admin_pct / 100, 2) as admin_amount,
    ROUND(purchase_amount * org_pct / 100, 2) as organization_amount,
    ROUND(purchase_amount * photographer_pct / 100, 2) as photographer_amount;
END;
$$;

-- Trigger to create revenue share when purchase is completed
CREATE OR REPLACE FUNCTION create_revenue_share_on_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  campaign_data RECORD;
  org_data RECORD;
  photographer_data RECORD;
  revenue_calc RECORD;
BEGIN
  -- Only process completed purchases
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get campaign and organization data
    SELECT c.*, o.admin_percentage, o.organization_percentage
    INTO campaign_data
    FROM campaigns c
    LEFT JOIN organizations o ON c.organization_id = o.id
    WHERE c.id = NEW.campaign_id;
    
    -- Get photographer percentage from event application or organization member
    SELECT COALESCE(ea.photographer_percentage, om.photographer_percentage, 0) as photographer_percentage
    INTO photographer_data
    FROM event_applications ea
    LEFT JOIN organization_members om ON om.organization_id = campaign_data.organization_id AND om.user_id = NEW.photographer_id
    WHERE ea.campaign_id = NEW.campaign_id AND ea.photographer_id = NEW.photographer_id
    LIMIT 1;
    
    -- Calculate revenue shares
    SELECT * INTO revenue_calc
    FROM calculate_revenue_share(
      NEW.amount,
      COALESCE(campaign_data.admin_percentage, 0),
      COALESCE(campaign_data.organization_percentage, 0),
      COALESCE(photographer_data.photographer_percentage, 0)
    );
    
    -- Insert revenue share record
    INSERT INTO revenue_shares (
      purchase_id,
      campaign_id,
      organization_id,
      photographer_id,
      admin_amount,
      organization_amount,
      photographer_amount,
      total_amount,
      admin_percentage,
      organization_percentage,
      photographer_percentage
    ) VALUES (
      NEW.id,
      NEW.campaign_id,
      campaign_data.organization_id,
      NEW.photographer_id,
      revenue_calc.admin_amount,
      revenue_calc.organization_amount,
      revenue_calc.photographer_amount,
      NEW.amount,
      COALESCE(campaign_data.admin_percentage, 0),
      COALESCE(campaign_data.organization_percentage, 0),
      COALESCE(photographer_data.photographer_percentage, 0)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_create_revenue_share
  AFTER INSERT OR UPDATE ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION create_revenue_share_on_purchase();

-- Insert default admin organization
INSERT INTO organizations (name, description, admin_percentage, is_active)
VALUES ('Photo Arena Admin', 'Organização administrativa principal', 10.00, true);

-- Update existing admin profiles
UPDATE profiles 
SET organization_role = 'admin'
WHERE role = 'admin';

-- Update existing photographer profiles
UPDATE profiles 
SET organization_role = 'photographer'
WHERE role = 'photographer' OR role = 'verified_photographer';

-- Update existing regular users
UPDATE profiles 
SET organization_role = 'user'
WHERE role = 'user' OR role IS NULL;

COMMENT ON TABLE organizations IS 'Organizations that can create and manage events';
COMMENT ON TABLE organization_members IS 'Users belonging to organizations with their roles and percentages';
COMMENT ON TABLE event_applications IS 'Photographer applications to participate in organization events';
COMMENT ON TABLE revenue_shares IS 'Revenue distribution tracking for each purchase';
COMMENT ON COLUMN organizations.admin_percentage IS 'Percentage that main admin takes from organization revenue';
COMMENT ON COLUMN organization_members.photographer_percentage IS 'Default percentage this photographer receives';
COMMENT ON COLUMN event_applications.photographer_percentage IS 'Specific percentage for this event application';