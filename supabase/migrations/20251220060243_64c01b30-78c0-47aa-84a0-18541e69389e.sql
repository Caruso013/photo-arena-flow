-- Adicionar constraint UNIQUE no nome da organização para evitar duplicatas
ALTER TABLE public.organizations 
ADD CONSTRAINT organizations_name_unique UNIQUE (name);

-- Criar índice para buscas rápidas por nome
CREATE INDEX IF NOT EXISTS idx_organizations_name_lower ON public.organizations(lower(name));