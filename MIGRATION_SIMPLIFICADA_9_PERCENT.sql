-- MIGRATION SIMPLIFICADA: Atualiza taxa da plataforma para 9%
-- Execute este SQL no Supabase SQL Editor

-- PASSO 1: Remover função antiga COM CASCADE (remove triggers dependentes automaticamente)
DROP FUNCTION IF EXISTS validate_campaign_percentages() CASCADE;

-- PASSO 2: Remover constraint antiga
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS check_percentage_sum_with_fixed_platform;

-- PASSO 2.1: Remover TAMBÉM a constraint check_percentage_sum_total_100 (conflito com nova regra)
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS check_percentage_sum_total_100;

-- PASSO 3: NÃO atualizar campanhas existentes (manter como estão)
-- Campanhas antigas continuam com 7%, novas serão 9%
-- (Comentado para não modificar dados históricos)
-- UPDATE public.campaigns SET platform_percentage = 9 WHERE platform_percentage != 9;

-- PASSO 4: Atualizar defaults das colunas
ALTER TABLE public.campaigns ALTER COLUMN platform_percentage SET DEFAULT 9;
ALTER TABLE public.campaigns ALTER COLUMN photographer_percentage SET DEFAULT 91;

-- PASSO 5: Adicionar nova constraint APENAS para novos registros (permite 7% ou 9%)
-- Não adicionar constraint rígida para permitir campanhas antigas com 7%
-- ALTER TABLE public.campaigns
-- ADD CONSTRAINT check_percentage_sum_with_fixed_platform
-- CHECK (
--   platform_percentage = 9 
--   AND (photographer_percentage + COALESCE(organization_percentage, 0)) = 91
-- );

-- PASSO 6: Criar função de validação NOVA (força 9% apenas em INSERT)
CREATE OR REPLACE FUNCTION validate_campaign_percentages()
RETURNS TRIGGER AS $$
BEGIN
  -- Aplicar regra de 9% APENAS para novos registros (INSERT)
  IF TG_OP = 'INSERT' THEN
    NEW.platform_percentage := 9;
    
    IF NEW.organization_id IS NULL THEN
      NEW.photographer_percentage := 91;
      NEW.organization_percentage := 0;
    ELSE
      IF NEW.photographer_percentage IS NULL THEN
        NEW.photographer_percentage := 91 - COALESCE(NEW.organization_percentage, 0);
      END IF;
      
      IF (NEW.photographer_percentage + COALESCE(NEW.organization_percentage, 0)) != 91 THEN
        RAISE EXCEPTION 'Soma fotografo + organizacao deve ser 91 (plataforma: 9)';
      END IF;
    END IF;
  END IF;
  -- Para UPDATE, não forçar mudança (permite manter 7% em campanhas antigas)
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PASSO 7: Criar trigger NOVO
CREATE TRIGGER trigger_validate_campaign_percentages
  BEFORE INSERT OR UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION validate_campaign_percentages();

-- PASSO 8: Atualizar view
CREATE OR REPLACE VIEW campaign_revenue_distribution AS
SELECT 
  id,
  title,
  platform_percentage,
  photographer_percentage,
  organization_percentage,
  organization_id,
  photographer_id,
  9.00 as platform_amount_example,
  (photographer_percentage * 1.0) as photographer_amount_example,
  (COALESCE(organization_percentage, 0) * 1.0) as organization_amount_example,
  CASE 
    WHEN organization_id IS NULL THEN 'Sem organizacao (Fotografo: 91%, Plataforma: 9%)'
    ELSE 'Com organizacao (Fotografo: ' || photographer_percentage || '%, Organizacao: ' || COALESCE(organization_percentage, 0) || '%, Plataforma: 9%)'
  END as revenue_split_description
FROM public.campaigns;

-- PASSO 9: Atualizar comentários
COMMENT ON VIEW campaign_revenue_distribution IS 'View auxiliar para distribuicao de receita. Taxa fixa: Plataforma 9%, restante 91% dividido entre fotografo e organizacao';
COMMENT ON COLUMN public.campaigns.platform_percentage IS 'Taxa da plataforma (FIXO: 9%)';
COMMENT ON COLUMN public.campaigns.photographer_percentage IS 'Percentual do fotografo (0-91%, padrao: 91%)';
COMMENT ON COLUMN public.campaigns.organization_percentage IS 'Percentual da organizacao (0-91%, padrao: 0%). Soma fotografo + organizacao = 91%';

-- VERIFICAÇÃO FINAL
SELECT 'Migration aplicada com sucesso!' as status;
SELECT id, title, platform_percentage, photographer_percentage, organization_percentage 
FROM campaigns 
LIMIT 5;
