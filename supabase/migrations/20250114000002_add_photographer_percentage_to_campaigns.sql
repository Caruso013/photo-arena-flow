-- Migration: Adicionar photographer_percentage em campaigns
-- Data: 2025-01-14
-- Descrição: Adiciona coluna photographer_percentage na tabela campaigns para sistema de divisão de receita

-- ================================================================
-- 1. ADICIONAR COLUNA photographer_percentage
-- ================================================================

DO $$
BEGIN
  -- Adicionar photographer_percentage se não existir
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'campaigns' 
    AND column_name = 'photographer_percentage'
  ) THEN
    ALTER TABLE public.campaigns 
    ADD COLUMN photographer_percentage NUMERIC(5,2) DEFAULT 91.00 CHECK (
      photographer_percentage >= 0 AND 
      photographer_percentage <= 100
    );
    
    COMMENT ON COLUMN public.campaigns.photographer_percentage IS 'Porcentagem que o fotógrafo recebe das vendas (0-100%)';
  END IF;
END $$;

-- ================================================================
-- 2. ATUALIZAR CAMPANHAS EXISTENTES
-- ================================================================

-- Atualizar campanhas existentes para ter 91% (100% - 9% da plataforma)
UPDATE public.campaigns
SET photographer_percentage = 91.00
WHERE photographer_percentage IS NULL;

-- ================================================================
-- 3. VALIDAÇÃO: Soma das porcentagens deve ser <= 100%
-- ================================================================

-- Adicionar constraint para validar que photographer + organization <= 100%
ALTER TABLE public.campaigns
DROP CONSTRAINT IF EXISTS check_percentage_sum;

ALTER TABLE public.campaigns
ADD CONSTRAINT check_percentage_sum CHECK (
  (COALESCE(photographer_percentage, 0) + COALESCE(organization_percentage, 0)) <= 100
);

COMMENT ON CONSTRAINT check_percentage_sum ON public.campaigns IS 'Garante que fotógrafo + organização não excedam 100%';

-- ================================================================
-- 4. VIEW: Resumo de divisão de receita por campanha
-- ================================================================

CREATE OR REPLACE VIEW public.campaign_revenue_split_view AS
SELECT 
  c.id,
  c.title,
  c.photographer_id,
  c.organization_id,
  c.photographer_percentage,
  c.organization_percentage,
  (100 - COALESCE(c.photographer_percentage, 0) - COALESCE(c.organization_percentage, 0)) AS platform_percentage,
  CASE 
    WHEN (c.photographer_percentage + COALESCE(c.organization_percentage, 0)) = 100 THEN 'Válido (sem taxa plataforma)'
    WHEN (c.photographer_percentage + COALESCE(c.organization_percentage, 0)) < 100 THEN 
      format('Válido (Plataforma: %s%%)', 100 - c.photographer_percentage - COALESCE(c.organization_percentage, 0))
    ELSE 'ERRO: Soma > 100%'
  END AS validation_status,
  p.full_name AS photographer_name,
  o.name AS organization_name
FROM public.campaigns c
LEFT JOIN public.profiles p ON c.photographer_id = p.id
LEFT JOIN public.organizations o ON c.organization_id = o.id
ORDER BY c.created_at DESC;

COMMENT ON VIEW public.campaign_revenue_split_view IS 'Mostra divisão de receita de cada campanha com validação';

-- ================================================================
-- 5. FUNCTION: Validar divisão de receita antes de inserir/atualizar
-- ================================================================

CREATE OR REPLACE FUNCTION public.validate_campaign_revenue_split()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validar que a soma não exceda 100%
  IF (COALESCE(NEW.photographer_percentage, 0) + COALESCE(NEW.organization_percentage, 0)) > 100 THEN
    RAISE EXCEPTION 'A soma de photographer_percentage (%) e organization_percentage (%) não pode exceder 100%%',
      NEW.photographer_percentage, 
      NEW.organization_percentage;
  END IF;
  
  -- Validar que se não há organização, organization_percentage deve ser 0
  IF NEW.organization_id IS NULL AND COALESCE(NEW.organization_percentage, 0) > 0 THEN
    RAISE EXCEPTION 'organization_percentage deve ser 0 quando não há organization_id';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para validar antes de INSERT/UPDATE
DROP TRIGGER IF EXISTS trigger_validate_campaign_revenue_split ON public.campaigns;
CREATE TRIGGER trigger_validate_campaign_revenue_split
  BEFORE INSERT OR UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_campaign_revenue_split();

-- ================================================================
-- 6. GRANTS
-- ================================================================

GRANT SELECT ON public.campaign_revenue_split_view TO authenticated;

-- ================================================================
-- 7. EXEMPLO DE USO
-- ================================================================

-- Ver divisão de receita de todas as campanhas
SELECT * FROM public.campaign_revenue_split_view;

-- Exemplo: Campanha com fotógrafo 91%, plataforma 9%, sem organização
-- photographer_percentage = 91.00
-- organization_percentage = 0.00
-- platform_percentage = 9.00 (calculado: 100 - 91 - 0)

-- Exemplo: Campanha com fotógrafo 70%, organização 20%, plataforma 10%
-- photographer_percentage = 70.00
-- organization_percentage = 20.00
-- platform_percentage = 10.00 (calculado: 100 - 70 - 20)
