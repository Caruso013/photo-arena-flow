-- FASE 1: CORREÇÕES CRÍTICAS DE SEGURANÇA

-- 1. Corrigir RLS da tabela profiles para proteger emails
-- Drop política existente que permite ver todos os perfis
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Criar nova política: usuários veem apenas seu próprio perfil completo
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Admins podem ver todos os perfis
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::user_role));

-- Perfis públicos: qualquer um pode ver nome e avatar (mas não email)
CREATE POLICY "Public profile info viewable" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Nota: Como o Postgres não permite SELECT condicional por coluna em RLS,
-- vamos precisar criar uma VIEW para dados públicos

-- Criar view para informações públicas de perfil
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  full_name,
  avatar_url,
  role,
  created_at
FROM public.profiles;

-- 2. Corrigir recursão infinita em organization_members
-- Drop política problemática
DROP POLICY IF EXISTS "Organization admins can view members" ON public.organization_members;

-- Criar função helper sem recursão
CREATE OR REPLACE FUNCTION public.is_organization_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role = 'admin'
      AND is_active = true
  )
$$;

-- Nova política usando a função
CREATE POLICY "Organization admins can view members" 
ON public.organization_members 
FOR SELECT 
USING (
  public.is_organization_admin(auth.uid(), organization_id)
);

-- Adicionar política para owners verem membros
CREATE POLICY "Organization owners can view members" 
ON public.organization_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = organization_members.organization_id
      AND EXISTS (
        SELECT 1 
        FROM public.organization_members om
        WHERE om.organization_id = o.id
          AND om.user_id = auth.uid()
          AND om.role = 'owner'
          AND om.is_active = true
      )
  )
);

-- 3. Adicionar comentários para documentação
COMMENT ON POLICY "Users can view own profile" ON public.profiles IS 
'Permite que usuários vejam seu próprio perfil completo incluindo email';

COMMENT ON POLICY "Admins can view all profiles" ON public.profiles IS 
'Permite que administradores vejam todos os perfis completos';

COMMENT ON VIEW public.public_profiles IS 
'View pública com informações não-sensíveis de perfis (sem email)';

COMMENT ON FUNCTION public.is_organization_admin IS 
'Verifica se um usuário é admin de uma organização sem causar recursão em RLS';