-- Sistema de porcentagens com taxa fixa de 7%
-- Taxa da plataforma FIXA em 7%
-- Os 93% restantes são divididos entre fotógrafo e organização

-- 1) Atualizar a taxa da plataforma para 7% (fixa)
UPDATE public.campaigns
SET platform_percentage = 7
WHERE platform_percentage IS NULL OR platform_percentage != 7;

-- 2) Definir valor padrão de 7% para novas campanhas (FIXO)
ALTER TABLE public.campaigns 
ALTER COLUMN platform_percentage SET DEFAULT 7;

-- 3) Ajustar campanhas existentes: se não tem organização, fotógrafo fica com 93%
UPDATE public.campaigns
SET 
  photographer_percentage = 93,
  organization_percentage = 0
WHERE organization_id IS NULL 
  AND (photographer_percentage IS NULL OR photographer_percentage = 0);

-- 4) Para campanhas COM organização, manter divisão personalizada dos 93%
-- Mas garantir que a soma de photographer + organization = 93%
UPDATE public.campaigns
SET photographer_percentage = 93 - COALESCE(organization_percentage, 0)
WHERE organization_id IS NOT NULL
  AND (photographer_percentage IS NULL OR photographer_percentage = 0);

-- 5) Remover constraint antigo
ALTER TABLE public.campaigns 
DROP CONSTRAINT IF EXISTS check_percentage_sum;

-- 6) Nova constraint: platform sempre 7%, resto soma 93%
ALTER TABLE public.campaigns
ADD CONSTRAINT check_percentage_sum_with_fixed_platform
CHECK (
  platform_percentage = 7 
  AND (photographer_percentage + COALESCE(organization_percentage, 0)) = 93
);

-- 7) Garantir que photographer_percentage não seja NULL
ALTER TABLE public.campaigns
ALTER COLUMN photographer_percentage SET NOT NULL;

-- 8) Definir padrão para photographer_percentage (93% quando sem organização)
ALTER TABLE public.campaigns 
ALTER COLUMN photographer_percentage SET DEFAULT 93;

-- 9) organization_percentage padrão é 0 (NULL = sem organização)
ALTER TABLE public.campaigns 
ALTER COLUMN organization_percentage SET DEFAULT 0;

-- 10) Comentários explicativos
COMMENT ON COLUMN public.campaigns.platform_percentage IS 'Taxa da plataforma (FIXO: 7%)';
COMMENT ON COLUMN public.campaigns.photographer_percentage IS 'Percentual do fotógrafo (0-93%, padrão: 93%)';
COMMENT ON COLUMN public.campaigns.organization_percentage IS 'Percentual da organização (0-93%, padrão: 0%). A soma de photographer + organization deve ser 93%';

-- 11) Criar função para validar porcentagens antes de insert/update
CREATE OR REPLACE FUNCTION validate_campaign_percentages()
RETURNS TRIGGER AS $$
BEGIN
  -- Forçar platform sempre em 7%
  NEW.platform_percentage := 7;
  
  -- Se não tem organização, fotógrafo fica com 93%
  IF NEW.organization_id IS NULL THEN
    NEW.photographer_percentage := 93;
    NEW.organization_percentage := 0;
  ELSE
    -- Se tem organização, garantir que soma seja 93%
    IF NEW.photographer_percentage IS NULL THEN
      NEW.photographer_percentage := 93 - COALESCE(NEW.organization_percentage, 0);
    END IF;
    
    -- Validar que a soma seja exatamente 93%
    IF (NEW.photographer_percentage + COALESCE(NEW.organization_percentage, 0)) != 93 THEN
      RAISE EXCEPTION 'A soma das porcentagens do fotógrafo e organização deve ser 93%% (plataforma mantém 7%% fixo)';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12) Criar trigger para validar antes de insert/update
DROP TRIGGER IF EXISTS trigger_validate_campaign_percentages ON public.campaigns;

CREATE TRIGGER trigger_validate_campaign_percentages
  BEFORE INSERT OR UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION validate_campaign_percentages();

-- 13) Criar view helper para calcular distribuição de receita
CREATE OR REPLACE VIEW campaign_revenue_distribution AS
SELECT 
  id,
  title,
  platform_percentage,
  photographer_percentage,
  organization_percentage,
  organization_id,
  photographer_id,
  -- Exemplos de cálculo para uma venda de R$ 100,00
  7.00 as platform_amount_example,
  (photographer_percentage * 1.0) as photographer_amount_example,
  (COALESCE(organization_percentage, 0) * 1.0) as organization_amount_example,
  CASE 
    WHEN organization_id IS NULL THEN 'Sem organização (Fotógrafo: 93%, Plataforma: 7%)'
    ELSE format('Com organização (Fotógrafo: %s%%, Organização: %s%%, Plataforma: 7%%)', 
                photographer_percentage, 
                COALESCE(organization_percentage, 0))
  END as revenue_split_description
FROM public.campaigns;

COMMENT ON VIEW campaign_revenue_distribution IS 'View auxiliar para visualizar a distribuição de receita de cada campanha. Taxa da plataforma é sempre 7% (R$ 7,00 de cada R$ 100,00)';
