-- Criar tabela para vincular usuários a organizações
CREATE TABLE IF NOT EXISTS public.organization_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Índices para performance
CREATE INDEX idx_organization_users_user_id ON public.organization_users(user_id);
CREATE INDEX idx_organization_users_organization_id ON public.organization_users(organization_id);

-- RLS para organization_users
ALTER TABLE public.organization_users ENABLE ROW LEVEL SECURITY;

-- Admins podem gerenciar todos os vínculos
CREATE POLICY "Admins can manage organization users"
ON public.organization_users FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Usuários da organização podem ver seu próprio vínculo
CREATE POLICY "Organization users can view their own link"
ON public.organization_users FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_organization_users_updated_at
BEFORE UPDATE ON public.organization_users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();