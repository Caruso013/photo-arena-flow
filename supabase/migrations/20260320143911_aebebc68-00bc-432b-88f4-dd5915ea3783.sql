
-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create mesario accounts table
CREATE TABLE public.mesario_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name text NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.mesario_accounts ENABLE ROW LEVEL SECURITY;

-- Admins can manage all mesario accounts
CREATE POLICY "Admins can manage mesario accounts" ON public.mesario_accounts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Org admins can manage their organization's mesarios
CREATE POLICY "Org admins can manage their mesarios" ON public.mesario_accounts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = mesario_accounts.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = mesario_accounts.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.is_active = true
    )
  );

-- Auto-hash password on insert/update using pgcrypto bcrypt
CREATE OR REPLACE FUNCTION public.hash_mesario_password()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.password_hash IS NOT NULL AND NEW.password_hash NOT LIKE '$2%' THEN
    NEW.password_hash := crypt(NEW.password_hash, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER hash_mesario_password_trigger
BEFORE INSERT OR UPDATE ON public.mesario_accounts
FOR EACH ROW EXECUTE FUNCTION public.hash_mesario_password();

-- Function to validate mesario credentials (used by edge function)
CREATE OR REPLACE FUNCTION public.validate_mesario_credentials(
  p_username text,
  p_password text
)
RETURNS TABLE(mesario_id uuid, mesario_name text, org_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT ma.id, ma.full_name, ma.organization_id
  FROM public.mesario_accounts ma
  WHERE ma.username = lower(trim(p_username))
    AND ma.password_hash = crypt(p_password, ma.password_hash)
    AND ma.is_active = true;
END;
$$;
