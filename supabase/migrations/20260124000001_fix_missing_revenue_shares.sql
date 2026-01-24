-- =====================================================
-- MIGRATION: Corrigir Revenue Shares Faltando
-- Data: 2026-01-24
-- =====================================================
-- PROBLEMA: Algumas compras foram marcadas como 'completed' mas não tiveram
-- revenue_shares criados (possivelmente por falha no trigger ou webhook)
--
-- SOLUÇÃO:
-- 1. Criar revenue_shares para todas as purchases 'completed' que não têm
-- 2. Melhorar o trigger para ser mais robusto

-- =====================================================
-- 1. CRIAR REVENUE_SHARES FALTANDO
-- =====================================================

-- Inserir revenue_shares para purchases completed que não têm
INSERT INTO revenue_shares (
  purchase_id,
  photographer_id,
  organization_id,
  platform_amount,
  photographer_amount,
  organization_amount
)
SELECT 
  p.id as purchase_id,
  p.photographer_id,
  c.organization_id,
  ROUND(p.amount * (COALESCE(c.platform_percentage, 9) / 100.0), 2) as platform_amount,
  ROUND(p.amount * (COALESCE(c.photographer_percentage, 91) / 100.0), 2) as photographer_amount,
  ROUND(p.amount * (COALESCE(c.organization_percentage, 0) / 100.0), 2) as organization_amount
FROM purchases p
JOIN photos ph ON p.photo_id = ph.id
JOIN campaigns c ON ph.campaign_id = c.id
WHERE p.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM revenue_shares rs WHERE rs.purchase_id = p.id
  );

-- Log quantos foram criados
DO $$
DECLARE
  created_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO created_count
  FROM revenue_shares rs
  JOIN purchases p ON rs.purchase_id = p.id
  WHERE p.status = 'completed';
  
  RAISE NOTICE 'Total de revenue_shares para purchases completed: %', created_count;
END $$;

-- =====================================================
-- 2. MELHORAR TRIGGER DE REVENUE SHARES
-- =====================================================

-- Atualizar função para ser mais robusta e logar erros
CREATE OR REPLACE FUNCTION calculate_revenue_shares()
RETURNS TRIGGER AS $$
DECLARE
  v_campaign_id UUID;
  v_organization_id UUID;
  v_campaign_platform_pct DECIMAL;
  v_photographer_pct DECIMAL;
  v_organization_pct DECIMAL;
  v_total_pct DECIMAL;
  v_existing_count INTEGER;
BEGIN
  -- Apenas processar quando a compra mudar para 'completed'
  IF NEW.status IS DISTINCT FROM 'completed' THEN
    RETURN NEW;
  END IF;
  
  -- Se já estava completed, não reprocessar
  IF OLD IS NOT NULL AND OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Verificar se já existe revenue_share para esta purchase
  SELECT COUNT(*) INTO v_existing_count
  FROM revenue_shares
  WHERE purchase_id = NEW.id;
  
  IF v_existing_count > 0 THEN
    RAISE NOTICE 'Revenue share já existe para purchase %', NEW.id;
    RETURN NEW;
  END IF;

  -- Buscar informações da campanha com TODAS as porcentagens
  SELECT 
    c.id,
    c.organization_id,
    COALESCE(c.platform_percentage, 9),
    COALESCE(c.photographer_percentage, 91),
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

  -- Se não encontrou a campanha, logar e retornar
  IF v_campaign_id IS NULL THEN
    RAISE WARNING 'Campanha não encontrada para foto % (purchase %)', NEW.photo_id, NEW.id;
    RETURN NEW;
  END IF;

  -- Validar que as porcentagens somam 100%
  v_total_pct := v_campaign_platform_pct + v_photographer_pct + v_organization_pct;
  
  IF v_total_pct != 100 THEN
    -- Recalcular platform_percentage como o restante
    RAISE NOTICE 'Ajustando porcentagens para campanha %. Total era: %', v_campaign_id, v_total_pct;
    v_campaign_platform_pct := 100 - v_photographer_pct - v_organization_pct;
  END IF;

  -- Se não houver organização, realocar porcentagem para plataforma
  IF v_organization_id IS NULL AND v_organization_pct > 0 THEN
    v_campaign_platform_pct := v_campaign_platform_pct + v_organization_pct;
    v_organization_pct := 0;
  END IF;

  -- Inserir registro em revenue_shares
  BEGIN
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
    );
    
    RAISE NOTICE 'Revenue share criado para purchase % (amount: %, plataforma: %, fotografo: %)', 
      NEW.id, NEW.amount, v_campaign_platform_pct, v_photographer_pct;
      
  EXCEPTION WHEN unique_violation THEN
    -- Já existe (race condition com webhook), apenas logar
    RAISE NOTICE 'Revenue share já existia para purchase % (race condition)', NEW.id;
  WHEN OTHERS THEN
    -- Logar erro mas não falhar a transação
    RAISE WARNING 'Erro ao criar revenue share para purchase %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Garantir que o trigger existe
DROP TRIGGER IF EXISTS trg_calculate_revenue_shares ON public.purchases;
CREATE TRIGGER trg_calculate_revenue_shares
  AFTER INSERT OR UPDATE ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION calculate_revenue_shares();

COMMENT ON FUNCTION calculate_revenue_shares() IS 
  'Calcula divisão de receita quando purchase é marcada como completed. Robusto contra duplicatas e erros.';

-- =====================================================
-- 3. VIEW PARA DIAGNÓSTICO DE PURCHASES SEM REVENUE SHARES
-- =====================================================

CREATE OR REPLACE VIEW public.purchases_missing_revenue_shares AS
SELECT 
  p.id as purchase_id,
  p.status,
  p.amount,
  p.created_at,
  p.photographer_id,
  ph.title as photo_title,
  c.title as campaign_title,
  'MISSING' as revenue_share_status
FROM purchases p
JOIN photos ph ON p.photo_id = ph.id
JOIN campaigns c ON ph.campaign_id = c.id
WHERE p.status = 'completed'
  AND NOT EXISTS (
    SELECT 1 FROM revenue_shares rs WHERE rs.purchase_id = p.id
  )
ORDER BY p.created_at DESC;

COMMENT ON VIEW public.purchases_missing_revenue_shares IS 
  'Lista purchases completed que não têm revenue_shares (problemas de sincronização)';

-- =====================================================
-- 4. FUNÇÃO PARA REPARAR REVENUE SHARES MANUALMENTE
-- =====================================================

CREATE OR REPLACE FUNCTION repair_missing_revenue_shares()
RETURNS TABLE(purchase_id UUID, status TEXT) AS $$
DECLARE
  r RECORD;
  v_campaign_id UUID;
  v_organization_id UUID;
  v_platform_pct DECIMAL;
  v_photographer_pct DECIMAL;
  v_organization_pct DECIMAL;
BEGIN
  FOR r IN 
    SELECT p.* FROM purchases p
    WHERE p.status = 'completed'
      AND NOT EXISTS (SELECT 1 FROM revenue_shares rs WHERE rs.purchase_id = p.id)
  LOOP
    -- Buscar porcentagens da campanha
    SELECT 
      c.id,
      c.organization_id,
      COALESCE(c.platform_percentage, 9),
      COALESCE(c.photographer_percentage, 91),
      COALESCE(c.organization_percentage, 0)
    INTO 
      v_campaign_id,
      v_organization_id,
      v_platform_pct,
      v_photographer_pct,
      v_organization_pct
    FROM photos ph
    JOIN campaigns c ON ph.campaign_id = c.id
    WHERE ph.id = r.photo_id;
    
    IF v_campaign_id IS NOT NULL THEN
      BEGIN
        INSERT INTO revenue_shares (
          purchase_id,
          photographer_id,
          organization_id,
          platform_amount,
          photographer_amount,
          organization_amount
        ) VALUES (
          r.id,
          r.photographer_id,
          v_organization_id,
          ROUND(r.amount * (v_platform_pct / 100), 2),
          ROUND(r.amount * (v_photographer_pct / 100), 2),
          ROUND(r.amount * (v_organization_pct / 100), 2)
        );
        
        purchase_id := r.id;
        status := 'CREATED';
        RETURN NEXT;
      EXCEPTION WHEN unique_violation THEN
        purchase_id := r.id;
        status := 'ALREADY_EXISTS';
        RETURN NEXT;
      END;
    ELSE
      purchase_id := r.id;
      status := 'CAMPAIGN_NOT_FOUND';
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION repair_missing_revenue_shares() IS 
  'Repara revenue_shares faltando para purchases completed. Retorna status de cada reparo.';
