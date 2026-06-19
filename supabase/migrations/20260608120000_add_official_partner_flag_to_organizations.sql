-- Permite que o admin escolha quais organizacoes aparecem como Parceiros Oficiais na Home
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS is_official_partner BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_organizations_official_partner
ON public.organizations(is_official_partner, name)
WHERE is_official_partner = true;

COMMENT ON COLUMN public.organizations.is_official_partner IS
'Define se a organizacao aparece na secao Parceiros Oficiais da Home';