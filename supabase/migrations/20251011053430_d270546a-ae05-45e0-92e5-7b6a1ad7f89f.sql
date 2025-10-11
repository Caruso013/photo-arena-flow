-- 1) Limpar completamente revenue_shares (será recalculada)
TRUNCATE TABLE public.revenue_shares RESTART IDENTITY CASCADE;

-- 2) Criar índice único para prevenir duplicados futuros
CREATE UNIQUE INDEX IF NOT EXISTS idx_revenue_shares_unique_purchase
ON public.revenue_shares (purchase_id);

-- 3) Atualizar função trigger para calcular shares corretamente
CREATE OR REPLACE FUNCTION public.calculate_revenue_shares()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign_id UUID;
  v_organization_id UUID;
  v_platform_pct DECIMAL;
  v_photographer_pct DECIMAL;
  v_organization_pct DECIMAL;
BEGIN
  -- Apenas processar quando a compra estiver concluída
  IF NEW.status IS DISTINCT FROM 'completed' THEN
    RETURN NEW;
  END IF;

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
    NEW.amount * (v_platform_pct / 100),
    NEW.amount * (v_photographer_pct / 100),
    NEW.amount * (v_organization_pct / 100)
  )
  ON CONFLICT (purchase_id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    platform_amount = EXCLUDED.platform_amount,
    photographer_amount = EXCLUDED.photographer_amount,
    organization_amount = EXCLUDED.organization_amount;

  RETURN NEW;
END;
$$;

-- 4) Criar trigger em purchases para calcular shares automaticamente
DROP TRIGGER IF EXISTS trg_calculate_revenue_shares ON public.purchases;
CREATE TRIGGER trg_calculate_revenue_shares
AFTER INSERT OR UPDATE OF status ON public.purchases
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION public.calculate_revenue_shares();

-- 5) Recalcular shares de todas as compras concluídas (backfill)
INSERT INTO public.revenue_shares (
  purchase_id,
  photographer_id,
  organization_id,
  platform_amount,
  photographer_amount,
  organization_amount
)
SELECT 
  p.id,
  p.photographer_id,
  c.organization_id,
  p.amount * ((c.platform_percentage + CASE WHEN c.organization_id IS NULL THEN COALESCE(c.organization_percentage, 0) ELSE 0 END) / 100.0) AS platform_amount,
  p.amount * (c.photographer_percentage / 100.0) AS photographer_amount,
  p.amount * (CASE WHEN c.organization_id IS NULL THEN 0 ELSE COALESCE(c.organization_percentage, 0) END / 100.0) AS organization_amount
FROM public.purchases p
JOIN public.photos ph ON ph.id = p.photo_id
JOIN public.campaigns c ON c.id = ph.campaign_id
WHERE p.status = 'completed';