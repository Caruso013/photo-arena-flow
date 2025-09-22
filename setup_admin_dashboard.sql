-- Script para executar diretamente no SQL Editor do Supabase
-- Este script criará as tabelas de organizações e dados de exemplo

-- 1. Criar tabelas de organizações
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  admin_percentage DECIMAL(5,2) NOT NULL DEFAULT 30.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'photographer' CHECK (role IN ('admin', 'photographer')),
  photographer_percentage DECIMAL(5,2) NOT NULL DEFAULT 70.00,
  is_active BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- 2. Habilitar RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 3. Adicionar coluna organization_id à tabela campaigns (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'campaigns' AND column_name = 'organization_id') THEN
        ALTER TABLE public.campaigns 
        ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Criar políticas RLS
DROP POLICY IF EXISTS "Anyone can view organizations" ON public.organizations;
CREATE POLICY "Anyone can view organizations" ON public.organizations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage organizations" ON public.organizations;
CREATE POLICY "Admins can manage organizations" ON public.organizations
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Members can view own membership" ON public.organization_members;
CREATE POLICY "Members can view own membership" ON public.organization_members
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Organization admins can view members" ON public.organization_members;
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

DROP POLICY IF EXISTS "Admins can manage all memberships" ON public.organization_members;
CREATE POLICY "Admins can manage all memberships" ON public.organization_members
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users can apply to organizations" ON public.organization_members;
CREATE POLICY "Users can apply to organizations" ON public.organization_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Inserir dados de exemplo
INSERT INTO public.organizations (name, description, admin_percentage) 
VALUES
  ('Eventos Premium', 'Organização especializada em eventos corporativos e sociais', 25.00),
  ('Foto Sport', 'Especializada em eventos esportivos e competições', 30.00),
  ('Casamentos & Festas', 'Focada em casamentos e celebrações familiares', 20.00)
ON CONFLICT DO NOTHING;

-- 6. Criar um usuário admin se não existir
DO $$
DECLARE
  admin_id UUID;
  org1_id UUID;
  org2_id UUID;
  org3_id UUID;
  photographer_id UUID;
BEGIN
  -- Verificar se existe um admin
  SELECT id INTO admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
  
  -- Se não existir admin, criar um
  IF admin_id IS NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (gen_random_uuid(), 'admin@photoarena.com', 'Administrador Sistema', 'admin')
    RETURNING id INTO admin_id;
  END IF;
  
  -- Get organization IDs
  SELECT id INTO org1_id FROM public.organizations WHERE name = 'Eventos Premium' LIMIT 1;
  SELECT id INTO org2_id FROM public.organizations WHERE name = 'Foto Sport' LIMIT 1;
  SELECT id INTO org3_id FROM public.organizations WHERE name = 'Casamentos & Festas' LIMIT 1;
  
  -- Criar ou pegar um fotografo
  SELECT id INTO photographer_id FROM public.profiles WHERE role = 'photographer' LIMIT 1;
  
  IF photographer_id IS NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (gen_random_uuid(), 'fotografo@exemplo.com', 'João Fotógrafo', 'photographer')
    RETURNING id INTO photographer_id;
  END IF;
  
  -- Inserir campanhas de exemplo
  INSERT INTO public.campaigns (photographer_id, organization_id, title, description, event_date, location, is_active) 
  VALUES
    (photographer_id, org1_id, 'Convenção Tech 2025', 'Grande evento de tecnologia com palestras e networking', '2025-10-15', 'Centro de Convenções - São Paulo', true),
    (photographer_id, org2_id, 'Campeonato Regional de Futebol', 'Torneio entre times da região metropolitana', '2025-11-20', 'Estádio Municipal - Rio de Janeiro', true),
    (photographer_id, org3_id, 'Casamento Marina & Carlos', 'Cerimônia e festa de casamento em venue exclusivo', '2025-12-05', 'Quinta dos Sonhos - Campinas', false),
    (photographer_id, org1_id, 'Formatura Medicina UFRJ', 'Colação de grau da turma de medicina', '2025-12-18', 'UFRJ - Rio de Janeiro', true)
  ON CONFLICT DO NOTHING;
    
  -- Adicionar o fotografo às organizações como pendente
  INSERT INTO public.organization_members (organization_id, user_id, role, is_active) 
  VALUES
    (org1_id, photographer_id, 'photographer', false),
    (org2_id, photographer_id, 'photographer', false),
    (org3_id, photographer_id, 'photographer', false)
  ON CONFLICT (organization_id, user_id) DO NOTHING;
END $$;

-- 7. Criar funções para atualizar timestamps
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

-- 8. Criar triggers
DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_organizations_updated_at();

DROP TRIGGER IF EXISTS update_organization_members_updated_at ON public.organization_members;
CREATE TRIGGER update_organization_members_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.update_organization_members_updated_at();

-- 9. Verificar resultados
SELECT 'Organizações criadas:' as status, count(*) as total FROM public.organizations;
SELECT 'Campanhas criadas:' as status, count(*) as total FROM public.campaigns;
SELECT 'Membros pendentes:' as status, count(*) as total FROM public.organization_members WHERE is_active = false;
SELECT 'Usuários admin:' as status, count(*) as total FROM public.profiles WHERE role = 'admin';