-- ==========================================
-- MELHORIAS NO SISTEMA DE REPASSE
-- ==========================================

-- 1. Melhorar RLS policies para payout_requests (permitir admins processarem)
DROP POLICY IF EXISTS "Admins can manage all requests" ON public.payout_requests;
DROP POLICY IF EXISTS "Photographers can create own requests" ON public.payout_requests;
DROP POLICY IF EXISTS "Photographers can view own requests" ON public.payout_requests;

-- Admins podem fazer tudo (incluindo UPDATE para processar)
CREATE POLICY "Admins can manage all payout requests"
ON public.payout_requests
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Fotógrafos podem criar e visualizar suas próprias solicitações
CREATE POLICY "Photographers can create own payout requests"
ON public.payout_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = photographer_id);

CREATE POLICY "Photographers can view own payout requests"
ON public.payout_requests
FOR SELECT
TO authenticated
USING (auth.uid() = photographer_id);

-- 2. Melhorar validação de saldo mínimo
CREATE OR REPLACE FUNCTION validate_payout_minimum_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_available_balance NUMERIC;
BEGIN
  -- Calcular saldo disponível
  SELECT COALESCE(SUM(photographer_amount), 0) - COALESCE(
    (SELECT SUM(amount) FROM payout_requests 
     WHERE photographer_id = NEW.photographer_id 
     AND status IN ('pending', 'approved', 'completed')), 0
  )
  INTO v_available_balance
  FROM revenue_shares
  WHERE photographer_id = NEW.photographer_id;

  -- Validar saldo mínimo de R$ 50
  IF NEW.amount < 50 THEN
    RAISE EXCEPTION 'O valor mínimo para solicitar repasse é R$ 50,00';
  END IF;

  -- Validar se tem saldo suficiente
  IF NEW.amount > v_available_balance THEN
    RAISE EXCEPTION 'Saldo insuficiente. Disponível: R$ %', v_available_balance;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_payout_balance_trigger ON public.payout_requests;
CREATE TRIGGER validate_payout_balance_trigger
BEFORE INSERT ON public.payout_requests
FOR EACH ROW
EXECUTE FUNCTION validate_payout_minimum_balance();

-- ==========================================
-- LIBERAR FOTÓGRAFOS PARA CRIAR EVENTOS
-- ==========================================

-- Fotógrafos já podem criar campanhas, apenas garantir que está correto
-- A policy já existe, apenas comentando para documentação

-- ==========================================
-- REGRA: EVENTOS SÓ APARECEM NA HOME COM 5+ FOTOS
-- ==========================================

-- Criar view para eventos elegíveis na home (5+ fotos)
CREATE OR REPLACE VIEW public.campaigns_for_home AS
SELECT 
  c.*,
  COUNT(DISTINCT p.id) as photo_count,
  COUNT(DISTINCT se.id) as album_count
FROM public.campaigns c
LEFT JOIN public.photos p ON p.campaign_id = c.id AND p.is_available = true
LEFT JOIN public.sub_events se ON se.campaign_id = c.id AND se.is_active = true
WHERE c.is_active = true
GROUP BY c.id
HAVING COUNT(DISTINCT p.id) >= 5
ORDER BY c.created_at DESC;

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_photos_campaign_available 
ON public.photos(campaign_id, is_available) 
WHERE is_available = true;

CREATE INDEX IF NOT EXISTS idx_campaigns_active_created 
ON public.campaigns(is_active, created_at DESC) 
WHERE is_active = true;

COMMENT ON VIEW public.campaigns_for_home IS 
'Campanhas elegíveis para exibição na home (mínimo 5 fotos disponíveis)';