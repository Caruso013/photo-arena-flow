-- Definir taxa padrão de 6% para a plataforma em todas as campanhas existentes e futuras

-- 1) Atualizar campanhas existentes que não têm platform_percentage definido ou está zerado
UPDATE public.campaigns
SET platform_percentage = 6
WHERE platform_percentage IS NULL OR platform_percentage = 0;

-- 2) Definir valor padrão de 6% para novas campanhas
ALTER TABLE public.campaigns 
ALTER COLUMN platform_percentage SET DEFAULT 6;

-- 3) Garantir que photographer_percentage seja 94% (100% - 6%) se não definido
UPDATE public.campaigns
SET photographer_percentage = 94
WHERE photographer_percentage IS NULL 
   OR photographer_percentage = 0
   OR (platform_percentage = 6 AND photographer_percentage != 94);

-- 4) Definir valor padrão para photographer_percentage
ALTER TABLE public.campaigns 
ALTER COLUMN photographer_percentage SET DEFAULT 94;

-- 5) Definir organization_percentage como 0 por padrão (sem organização)
ALTER TABLE public.campaigns 
ALTER COLUMN organization_percentage SET DEFAULT 0;

-- 6) Adicionar constraint para garantir que a soma seja sempre 100%
ALTER TABLE public.campaigns 
DROP CONSTRAINT IF EXISTS check_percentage_sum;

ALTER TABLE public.campaigns
ADD CONSTRAINT check_percentage_sum 
CHECK (
  (platform_percentage + photographer_percentage + COALESCE(organization_percentage, 0)) = 100
);

-- 7) Comentários explicativos
COMMENT ON COLUMN public.campaigns.platform_percentage IS 'Percentual da plataforma (padrão: 6%)';
COMMENT ON COLUMN public.campaigns.photographer_percentage IS 'Percentual do fotógrafo (padrão: 94%)';
COMMENT ON COLUMN public.campaigns.organization_percentage IS 'Percentual da organização (padrão: 0%, apenas se houver organização)';
