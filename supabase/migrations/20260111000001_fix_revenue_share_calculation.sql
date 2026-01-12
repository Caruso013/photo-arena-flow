-- =====================================================
-- MIGRATION: Fix Revenue Share Calculation Bug
-- =====================================================
-- PROBLEMA IDENTIFICADO:
-- A função calculate_revenue_shares() busca photographer_percentage da campanha
-- mas calcula platform_percentage usando get_photographer_platform_percentage()
-- Isso pode resultar em soma != 100%
--
-- SOLUÇÃO:
-- Usar as porcentagens da campanha como base e garantir que sempre somem 100%
-- A taxa da plataforma é calculada como: 100 - photographer_percentage - organization_percentage

-- Corrigir função de cálculo de revenue shares
CREATE OR REPLACE FUNCTION calculate_revenue_shares()
RETURNS TRIGGER AS $$
DECLARE
  v_campaign_id UUID;
  v_organization_id UUID;
  v_campaign_platform_pct DECIMAL;
  v_photographer_pct DECIMAL;
  v_organization_pct DECIMAL;
  v_total_pct DECIMAL;
BEGIN
  -- Apenas processar quando a compra estiver concluída
  IF NEW.status IS DISTINCT FROM 'completed' THEN
    RETURN NEW;
  END IF;

  -- Buscar informações da campanha com TODAS as porcentagens
  SELECT 
    c.id,
    c.organization_id,
    c.platform_percentage,
    c.photographer_percentage,
    COALESCE(c.organization_percentage, 0)
  INTO 
    v_campaign_id,
    v_organization_id,
    v_campaign_platform_pct,
    v_photographer_pct,
    v_organization_pct
  FROM photos p
  JOIN campaigns c ON p.campaign_id = c.id
  WHERE p.id = NEW.photo_id;

  -- Se não encontrou a campanha, retornar sem processar
  IF v_campaign_id IS NULL THEN
    RAISE WARNING 'Campanha não encontrada para foto %', NEW.photo_id;
    RETURN NEW;
  END IF;

  -- Validar que as porcentagens somam 100%
  v_total_pct := v_campaign_platform_pct + v_photographer_pct + v_organization_pct;
  
  IF v_total_pct != 100 THEN
    -- Se não soma 100%, recalcular platform_percentage como o restante
    -- Isso garante consistência mesmo com dados legados
    RAISE NOTICE 'Ajustando porcentagens para campanha %. Total era: %', v_campaign_id, v_total_pct;
    v_campaign_platform_pct := 100 - v_photographer_pct - v_organization_pct;
  END IF;

  -- Se não houver organização, realocar porcentagem da org para plataforma
  IF v_organization_id IS NULL AND v_organization_pct > 0 THEN
    v_campaign_platform_pct := v_campaign_platform_pct + v_organization_pct;
    v_organization_pct := 0;
  END IF;

  -- Inserir/atualizar registro em revenue_shares (1 por purchase)
  INSERT INTO revenue_shares (
    purchase_id,
    photographer_id,
    organization_id,
    platform_amount,
    photographer_amount,
    organization_amount
  ) VALUES (
    NEW.id,
    NEW.photographer_id,
    v_organization_id,
    ROUND(NEW.amount * (v_campaign_platform_pct / 100), 2),
    ROUND(NEW.amount * (v_photographer_pct / 100), 2),
    ROUND(NEW.amount * (v_organization_pct / 100), 2)
  )
  ON CONFLICT (purchase_id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    platform_amount = EXCLUDED.platform_amount,
    photographer_amount = EXCLUDED.photographer_amount,
    organization_amount = EXCLUDED.organization_amount;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

COMMENT ON FUNCTION calculate_revenue_shares() IS 'Calcula divisão de receita usando porcentagens da campanha. Garante que soma = 100%';

-- =====================================================
-- VIEW para diagnóstico de problemas de porcentagem
-- =====================================================
CREATE OR REPLACE VIEW public.campaigns_percentage_diagnosis AS
SELECT 
  c.id,
  c.title,
  c.platform_percentage,
  c.photographer_percentage,
  COALESCE(c.organization_percentage, 0) as organization_percentage,
  (c.platform_percentage + c.photographer_percentage + COALESCE(c.organization_percentage, 0)) as total_percentage,
  CASE 
    WHEN (c.platform_percentage + c.photographer_percentage + COALESCE(c.organization_percentage, 0)) = 100 
    THEN '✅ OK'
    ELSE '❌ ERRO: Soma != 100%'
  END as status,
  c.organization_id IS NOT NULL as has_organization,
  c.created_at
FROM campaigns c
ORDER BY c.created_at DESC;

COMMENT ON VIEW public.campaigns_percentage_diagnosis IS 'Diagnóstico de campanhas com porcentagens inconsistentes';

-- =====================================================
-- Corrigir campanhas com porcentagens inconsistentes
-- Recalcular platform_percentage para garantir soma = 100%
-- =====================================================
UPDATE campaigns 
SET platform_percentage = 100 - photographer_percentage - COALESCE(organization_percentage, 0)
WHERE (platform_percentage + photographer_percentage + COALESCE(organization_percentage, 0)) != 100;

-- =====================================================
-- Adicionar constraint para garantir integridade futura
-- =====================================================
-- Nota: Constraint adicionada como WARNING, não como bloqueio
-- para permitir flexibilidade em casos especiais

-- Trigger para validar porcentagens antes de inserir/atualizar
CREATE OR REPLACE FUNCTION validate_campaign_percentages()
RETURNS TRIGGER AS $$
DECLARE
  v_total DECIMAL;
BEGIN
  v_total := NEW.platform_percentage + NEW.photographer_percentage + COALESCE(NEW.organization_percentage, 0);
  
  IF v_total != 100 THEN
    RAISE WARNING 'Porcentagens da campanha % somam % (deveria ser 100%%)', NEW.title, v_total;
    -- Corrigir automaticamente platform_percentage
    NEW.platform_percentage := 100 - NEW.photographer_percentage - COALESCE(NEW.organization_percentage, 0);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_campaign_percentages ON campaigns;
CREATE TRIGGER trg_validate_campaign_percentages
BEFORE INSERT OR UPDATE ON campaigns
FOR EACH ROW
EXECUTE FUNCTION validate_campaign_percentages();

COMMENT ON FUNCTION validate_campaign_percentages() IS 'Valida e corrige automaticamente porcentagens de campanhas para somar 100%';
