-- ========================================
-- FASE 1: Reestruturação do Banco de Dados
-- Sistema de Divisão de Receita por Campanha
-- ========================================

-- 1.1 Adicionar campos de porcentagem na tabela campaigns
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS platform_percentage DECIMAL(5,2) DEFAULT 60.00 NOT NULL,
ADD COLUMN IF NOT EXISTS photographer_percentage DECIMAL(5,2) DEFAULT 10.00 NOT NULL,
ADD COLUMN IF NOT EXISTS organization_percentage DECIMAL(5,2) DEFAULT 30.00 NOT NULL;

-- Atualizar campanhas existentes com os valores padrão
UPDATE campaigns 
SET 
  platform_percentage = 60.00,
  photographer_percentage = 10.00,
  organization_percentage = 30.00;

-- 1.2 Adicionar constraint para garantir soma = 100%
ALTER TABLE campaigns
DROP CONSTRAINT IF EXISTS check_percentage_sum;

ALTER TABLE campaigns
ADD CONSTRAINT check_percentage_sum 
CHECK (platform_percentage + photographer_percentage + COALESCE(organization_percentage, 0) = 100);

-- 1.3 Criar função que calcula revenue_shares automaticamente
CREATE OR REPLACE FUNCTION public.calculate_revenue_shares()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_campaign_id UUID;
  v_organization_id UUID;
  v_platform_pct DECIMAL;
  v_photographer_pct DECIMAL;
  v_organization_pct DECIMAL;
BEGIN
  -- Buscar informações da campanha
  SELECT 
    c.id,
    c.organization_id,
    c.platform_percentage,
    c.photographer_percentage,
    COALESCE(c.organization_percentage, 0)
  INTO 
    v_campaign_id,
    v_organization_id,
    v_platform_pct,
    v_photographer_pct,
    v_organization_pct
  FROM photos p
  JOIN campaigns c ON p.campaign_id = c.id
  WHERE p.id = NEW.photo_id;

  -- Se não houver organização, realocar porcentagem para plataforma
  IF v_organization_id IS NULL THEN
    v_platform_pct := v_platform_pct + v_organization_pct;
    v_organization_pct := 0;
  END IF;

  -- Inserir registro em revenue_shares
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
    NEW.amount * (v_platform_pct / 100),
    NEW.amount * (v_photographer_pct / 100),
    NEW.amount * (v_organization_pct / 100)
  );

  RETURN NEW;
END;
$$;

-- 1.4 Criar trigger para calcular revenue_shares quando purchase é completado
DROP TRIGGER IF EXISTS on_purchase_completed ON purchases;

CREATE TRIGGER on_purchase_completed
AFTER INSERT OR UPDATE OF status ON purchases
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION public.calculate_revenue_shares();

-- 1.5 Remover política que permite fotógrafos criarem campanhas
DROP POLICY IF EXISTS "Photographers can create campaigns" ON campaigns;

-- 1.6 Criar índices para melhorar performance de queries de revenue_shares
CREATE INDEX IF NOT EXISTS idx_revenue_shares_photographer ON revenue_shares(photographer_id);
CREATE INDEX IF NOT EXISTS idx_revenue_shares_organization ON revenue_shares(organization_id);
CREATE INDEX IF NOT EXISTS idx_revenue_shares_created_at ON revenue_shares(created_at);

-- 1.7 Adicionar comentários para documentação
COMMENT ON COLUMN campaigns.platform_percentage IS 'Porcentagem que vai para a plataforma (0-100)';
COMMENT ON COLUMN campaigns.photographer_percentage IS 'Porcentagem que vai para o fotógrafo (0-100)';
COMMENT ON COLUMN campaigns.organization_percentage IS 'Porcentagem que vai para a organização (0-100). Soma deve ser 100%.';
COMMENT ON FUNCTION public.calculate_revenue_shares IS 'Calcula automaticamente a divisão de receita quando uma compra é completada';

-- ========================================
-- RESUMO DA MIGRAÇÃO:
-- ========================================
-- ✅ Campos de porcentagem adicionados à tabela campaigns
-- ✅ Valores padrão: 60% plataforma, 10% fotógrafo, 30% organização
-- ✅ Constraint garante soma = 100%
-- ✅ Trigger automático para calcular revenue_shares
-- ✅ Política de RLS ajustada (apenas ADMIN cria campanhas)
-- ✅ Índices criados para performance
-- ========================================