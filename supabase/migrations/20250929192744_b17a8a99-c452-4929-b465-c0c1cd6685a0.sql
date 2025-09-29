-- FASE 2: IMPLEMENTAR RBAC ADEQUADO

-- 1. Criar funções helper para verificação de permissões organizacionais
CREATE OR REPLACE FUNCTION public.is_organization_owner(_user_id uuid, _org_id uuid)
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
      AND role = 'owner'
      AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.is_organization_member(_user_id uuid, _org_id uuid)
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
      AND is_active = true
  )
$$;

-- 2. Atualizar políticas RLS de organization_members para incluir owners
DROP POLICY IF EXISTS "Organization owners can manage members" ON public.organization_members;
CREATE POLICY "Organization owners can manage members" 
ON public.organization_members 
FOR ALL
USING (
  public.is_organization_owner(auth.uid(), organization_id)
);

DROP POLICY IF EXISTS "Organization admins can manage members" ON public.organization_members;
CREATE POLICY "Organization admins can manage members" 
ON public.organization_members 
FOR UPDATE
USING (
  public.is_organization_admin(auth.uid(), organization_id)
);

-- 3. Atualizar políticas de campaigns para owners e admins de organização
DROP POLICY IF EXISTS "Organization owners can manage campaigns" ON public.campaigns;
CREATE POLICY "Organization owners can manage campaigns" 
ON public.campaigns 
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = campaigns.organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND is_active = true
  )
);

-- 4. Adicionar política para organization admins processarem applications
DROP POLICY IF EXISTS "Organization admins can process applications" ON public.event_applications;
CREATE POLICY "Organization admins can process applications" 
ON public.event_applications 
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM campaigns c
    JOIN organization_members om ON c.organization_id = om.organization_id
    WHERE c.id = event_applications.campaign_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.is_active = true
  )
);

-- 5. Adicionar comentários de documentação
COMMENT ON FUNCTION public.is_organization_owner IS 
'Verifica se um usuário é owner de uma organização';

COMMENT ON FUNCTION public.is_organization_member IS 
'Verifica se um usuário é membro ativo de uma organização';

COMMENT ON POLICY "Organization owners can manage members" ON public.organization_members IS 
'Permite que owners gerenciem todos os membros da organização';

COMMENT ON POLICY "Organization admins can manage members" ON public.organization_members IS 
'Permite que admins atualizem membros da organização';

COMMENT ON POLICY "Organization owners can manage campaigns" ON public.campaigns IS 
'Permite que owners e admins da organização gerenciem campanhas';

COMMENT ON POLICY "Organization admins can process applications" ON public.event_applications IS 
'Permite que admins e owners da organização processem candidaturas de fotógrafos';