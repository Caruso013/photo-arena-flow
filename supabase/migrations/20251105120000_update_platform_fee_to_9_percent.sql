-- Atualiza taxa da plataforma para 9% (era 7%)
-- Taxa fixa: Plataforma 9%, restante 91% dividido entre fotógrafo e organização

-- 1) Atualizar campanhas existentes para platform_percentage = 9
UPDATE public.campaigns
SET platform_percentage = 9
WHERE platform_percentage != 9;

-- 2) Ajustar photographer_percentage e organization_percentage para somarem 91%
-- Para campanhas SEM organização: fotógrafo fica com 91%
UPDATE public.campaigns
SET 
  photographer_percentage = 91,
  organization_percentage = 0
WHERE organization_id IS NULL;

-- Para campanhas COM organização: ajustar photographer para completar 91%
UPDATE public.campaigns
SET photographer_percentage = 91 - COALESCE(organization_percentage, 0)
WHERE organization_id IS NOT NULL;

-- 3) Atualizar DEFAULT da coluna para 9%
ALTER TABLE public.campaigns 
ALTER COLUMN platform_percentage SET DEFAULT 9;

-- 4) Atualizar DEFAULT do photographer_percentage para 91%
ALTER TABLE public.campaigns 
ALTER COLUMN photographer_percentage SET DEFAULT 91;

-- 5) Remover constraint antiga se existir
ALTER TABLE public.campaigns 
DROP CONSTRAINT IF EXISTS check_percentage_sum_with_fixed_platform;

-- 6) Criar nova constraint: platform = 9%, fotógrafo + org = 91%
ALTER TABLE public.campaigns
ADD CONSTRAINT check_percentage_sum_with_fixed_platform
CHECK (
  platform_percentage = 9 
  AND (photographer_percentage + COALESCE(organization_percentage, 0)) = 91
);

-- 7) Atualizar função de validação para forçar 9% na plataforma
CREATE OR REPLACE FUNCTION validate_campaign_percentages()
RETURNS TRIGGER AS $$
BEGIN
  -- Forçar platform sempre em 9%
  NEW.platform_percentage := 9;
  
  -- Se não tem organização, fotógrafo fica com 91%
  IF NEW.organization_id IS NULL THEN
    NEW.photographer_percentage := 91;
    NEW.organization_percentage := 0;
  ELSE
    -- Se tem organização, garantir que soma seja 91%
    IF NEW.photographer_percentage IS NULL THEN
      NEW.photographer_percentage := 91 - COALESCE(NEW.organization_percentage, 0);
    END IF;
    
    -- Validar que a soma seja exatamente 91%
    IF (NEW.photographer_percentage + COALESCE(NEW.organization_percentage, 0)) != 91 THEN
      RAISE EXCEPTION 'A soma das porcentagens do fotografo e organizacao deve ser exatamente 91 (plataforma: 9)';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8) Recriar trigger com a função atualizada
DROP TRIGGER IF EXISTS trigger_validate_campaign_percentages ON public.campaigns;

CREATE TRIGGER trigger_validate_campaign_percentages
  BEFORE INSERT OR UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION validate_campaign_percentages();

-- 9) Atualizar view auxiliar para refletir os 9%
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
  9.00 as platform_amount_example,
  (photographer_percentage * 1.0) as photographer_amount_example,
  (COALESCE(organization_percentage, 0) * 1.0) as organization_amount_example,
  CASE 
    WHEN organization_id IS NULL THEN 'Sem organizacao (Fotografo: 91%, Plataforma: 9%)'
    ELSE 'Com organizacao (Fotografo: ' || photographer_percentage || '%, Organizacao: ' || COALESCE(organization_percentage, 0) || '%, Plataforma: 9%)'
  END as revenue_split_description
FROM public.campaigns;

-- 10) Atualizar comentário da view
COMMENT ON VIEW campaign_revenue_distribution IS 'View auxiliar para distribuicao de receita. Taxa fixa: Plataforma 9%, restante 91% dividido entre fotografo e organizacao';

-- 11) Atualizar comentários das colunas
COMMENT ON COLUMN public.campaigns.platform_percentage IS 'Taxa da plataforma (FIXO: 9%)';
COMMENT ON COLUMN public.campaigns.photographer_percentage IS 'Percentual do fotografo (0-91%, padrao: 91%)';
COMMENT ON COLUMN public.campaigns.organization_percentage IS 'Percentual da organizacao (0-91%, padrao: 0%). Soma fotografo + organizacao = 91%';
