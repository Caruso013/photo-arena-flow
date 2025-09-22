-- Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  admin_percentage DECIMAL(5,2) NOT NULL DEFAULT 30.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create organization_members table
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'photographer' CHECK (role IN ('admin', 'photographer')),
  photographer_percentage DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  is_active BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Add organization_id to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- RLS Policies for organizations
CREATE POLICY "Anyone can view organizations" ON public.organizations
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage organizations" ON public.organizations
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for organization_members
CREATE POLICY "Members can view own membership" ON public.organization_members
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Organization admins can view members" ON public.organization_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role = 'admin'
      AND om.is_active = true
    )
  );

CREATE POLICY "Admins can manage all memberships" ON public.organization_members
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can apply to organizations" ON public.organization_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert some sample data for testing
INSERT INTO public.organizations (name, description, admin_percentage) VALUES
  ('Eventos Premium', 'Organização especializada em eventos corporativos e sociais', 25.00),
  ('Foto Sport', 'Especializada em eventos esportivos e competições', 30.00),
  ('Casamentos & Festas', 'Focada em casamentos e celebrações familiares', 20.00);

-- Note: Sample campaigns and organization members will be created when real users register
-- This avoids foreign key constraints with auth.users

-- Create functions for updating timestamps
CREATE OR REPLACE FUNCTION public.update_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_organization_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_organizations_updated_at();

CREATE TRIGGER update_organization_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_organization_members_updated_at();