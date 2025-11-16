-- Migration: Sistema de Taxa Dupla (7% fixo + variável) e Cupons
-- Data: 2025-01-14
-- Descrição: Implementa taxa fixa de 7% + taxa variável controlável pelo admin + sistema de cupons

-- ================================================================
-- 1. ATUALIZAR SYSTEM_CONFIG PARA TAXA DUPLA
-- ================================================================

-- Adicionar configuração de taxa variável (0-20%)
INSERT INTO public.system_config (key, value, description)
VALUES (
  'variable_percentage', 
  '{"value": 3, "min": 0, "max": 20, "enabled": true}',
  'Taxa variável da plataforma (0-20%) controlada pelo admin'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = now();

-- Atualizar configuração da taxa fixa para 7%
UPDATE public.system_config
SET value = '{"value": 7, "min": 7, "max": 7}'
WHERE key = 'platform_percentage';

-- Comentário explicativo
COMMENT ON COLUMN public.system_config.value IS 'JSON com value (taxa atual), min, max e enabled (para taxa variável)';

-- ================================================================
-- 2. CRIAR TABELA DE CUPONS
-- ================================================================

CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  type text NOT NULL CHECK (type IN ('fixed', 'percentage')),
  value numeric NOT NULL CHECK (value > 0),
  description text,
  start_date timestamptz NOT NULL DEFAULT now(),
  end_date timestamptz,
  max_uses integer DEFAULT NULL, -- NULL = ilimitado
  current_uses integer NOT NULL DEFAULT 0,
  min_purchase_amount numeric DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Validações
  CONSTRAINT valid_code CHECK (length(trim(code)) >= 3),
  CONSTRAINT valid_percentage CHECK (type != 'percentage' OR value <= 100),
  CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date > start_date),
  CONSTRAINT valid_uses CHECK (max_uses IS NULL OR max_uses > 0)
);

-- Índices para performance
CREATE INDEX idx_coupons_code ON public.coupons(code) WHERE is_active = true;
CREATE INDEX idx_coupons_active ON public.coupons(is_active, end_date);
CREATE INDEX idx_coupons_dates ON public.coupons(start_date, end_date);

-- Comentários
COMMENT ON TABLE public.coupons IS 'Cupons de desconto criados pelo admin';
COMMENT ON COLUMN public.coupons.type IS 'fixed = valor fixo em R$, percentage = percentual de desconto';
COMMENT ON COLUMN public.coupons.value IS 'Valor do desconto (R$ para fixed, % para percentage)';
COMMENT ON COLUMN public.coupons.max_uses IS 'NULL = ilimitado, número = máximo de usos';
COMMENT ON COLUMN public.coupons.min_purchase_amount IS 'Valor mínimo da compra para usar o cupom';

-- ================================================================
-- 3. CRIAR TABELA DE USO DE CUPONS
-- ================================================================

CREATE TABLE IF NOT EXISTS public.coupon_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  purchase_id uuid REFERENCES public.purchases(id) ON DELETE SET NULL,
  discount_amount numeric NOT NULL CHECK (discount_amount >= 0),
  original_amount numeric NOT NULL CHECK (original_amount > 0),
  final_amount numeric NOT NULL CHECK (final_amount >= 0),
  used_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_discount CHECK (discount_amount <= original_amount),
  CONSTRAINT valid_final CHECK (final_amount = original_amount - discount_amount)
);

-- Índices
CREATE INDEX idx_coupon_uses_coupon ON public.coupon_uses(coupon_id);
CREATE INDEX idx_coupon_uses_user ON public.coupon_uses(user_id);
CREATE INDEX idx_coupon_uses_purchase ON public.coupon_uses(purchase_id);
CREATE INDEX idx_coupon_uses_date ON public.coupon_uses(used_at);

COMMENT ON TABLE public.coupon_uses IS 'Histórico de uso de cupons';

-- ================================================================
-- 4. FUNCTIONS: CALCULAR TAXA TOTAL E VALIDAR CUPOM
-- ================================================================

-- Function: Obter taxa total da plataforma (fixa + variável)
CREATE OR REPLACE FUNCTION public.get_total_platform_percentage()
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT 
    COALESCE((SELECT (value->>'value')::numeric FROM public.system_config WHERE key = 'platform_percentage'), 7) +
    COALESCE(
      CASE 
        WHEN (SELECT (value->>'enabled')::boolean FROM public.system_config WHERE key = 'variable_percentage') = true
        THEN (SELECT (value->>'value')::numeric FROM public.system_config WHERE key = 'variable_percentage')
        ELSE 0
      END,
      0
    );
$$;

COMMENT ON FUNCTION public.get_total_platform_percentage() IS 'Retorna taxa total: fixa (7%) + variável (0-20% se ativa)';

-- Function: Validar cupom
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code text,
  p_user_id uuid,
  p_purchase_amount numeric
)
RETURNS TABLE (
  valid boolean,
  coupon_id uuid,
  discount_amount numeric,
  message text
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_coupon record;
  v_discount numeric;
BEGIN
  -- Buscar cupom
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE code = upper(trim(p_code))
    AND is_active = true
  LIMIT 1;

  -- Cupom não existe ou está inativo
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, 0::numeric, 'Cupom inválido ou inativo'::text;
    RETURN;
  END IF;

  -- Verificar data de início
  IF v_coupon.start_date > now() THEN
    RETURN QUERY SELECT false, NULL::uuid, 0::numeric, 'Cupom ainda não está ativo'::text;
    RETURN;
  END IF;

  -- Verificar data de expiração
  IF v_coupon.end_date IS NOT NULL AND v_coupon.end_date < now() THEN
    RETURN QUERY SELECT false, NULL::uuid, 0::numeric, 'Cupom expirado'::text;
    RETURN;
  END IF;

  -- Verificar limite de usos
  IF v_coupon.max_uses IS NOT NULL AND v_coupon.current_uses >= v_coupon.max_uses THEN
    RETURN QUERY SELECT false, NULL::uuid, 0::numeric, 'Cupom já atingiu o limite de usos'::text;
    RETURN;
  END IF;

  -- Verificar valor mínimo de compra
  IF p_purchase_amount < v_coupon.min_purchase_amount THEN
    RETURN QUERY SELECT 
      false, 
      NULL::uuid, 
      0::numeric, 
      format('Valor mínimo de compra: R$ %.2f', v_coupon.min_purchase_amount)::text;
    RETURN;
  END IF;

  -- Calcular desconto
  IF v_coupon.type = 'fixed' THEN
    v_discount := LEAST(v_coupon.value, p_purchase_amount); -- Não pode ser maior que o valor total
  ELSE -- percentage
    v_discount := (p_purchase_amount * v_coupon.value / 100);
  END IF;

  -- Cupom válido!
  RETURN QUERY SELECT true, v_coupon.id, v_discount, 'Cupom aplicado com sucesso!'::text;
END;
$$;

COMMENT ON FUNCTION public.validate_coupon IS 'Valida cupom e retorna desconto aplicável';

-- ================================================================
-- 5. TRIGGER: INCREMENTAR USO DE CUPOM
-- ================================================================

CREATE OR REPLACE FUNCTION public.increment_coupon_usage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE public.coupons
  SET 
    current_uses = current_uses + 1,
    updated_at = now()
  WHERE id = NEW.coupon_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_increment_coupon_usage
  AFTER INSERT ON public.coupon_uses
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_coupon_usage();

-- ================================================================
-- 6. TRIGGER: AUTO-DESATIVAR CUPONS EXPIRADOS
-- ================================================================

CREATE OR REPLACE FUNCTION public.auto_deactivate_expired_coupons()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Desativar cupons expirados
  UPDATE public.coupons
  SET 
    is_active = false,
    updated_at = now()
  WHERE is_active = true
    AND end_date < now();

  -- Desativar cupons que atingiram limite de usos
  UPDATE public.coupons
  SET 
    is_active = false,
    updated_at = now()
  WHERE is_active = true
    AND max_uses IS NOT NULL
    AND current_uses >= max_uses;

  RETURN NEW;
END;
$$;

-- Trigger executado a cada INSERT em coupon_uses
CREATE TRIGGER trigger_auto_deactivate_coupons
  AFTER INSERT ON public.coupon_uses
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.auto_deactivate_expired_coupons();

-- ================================================================
-- 7. RLS POLICIES
-- ================================================================

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_uses ENABLE ROW LEVEL SECURITY;

-- Coupons: APENAS ADMIN pode criar/editar/deletar
DROP POLICY IF EXISTS "Admins manage coupons" ON public.coupons;
CREATE POLICY "Admins manage coupons"
ON public.coupons
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Coupons: Todos autenticados podem VER cupons ativos (para aplicar no checkout)
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;
CREATE POLICY "Anyone can view active coupons"
ON public.coupons
FOR SELECT
TO authenticated
USING (is_active = true AND (end_date IS NULL OR end_date > now()));

-- Coupon Uses: Usuários veem próprios usos
DROP POLICY IF EXISTS "Users view own coupon uses" ON public.coupon_uses;
CREATE POLICY "Users view own coupon uses"
ON public.coupon_uses
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Coupon Uses: Admin vê todos
DROP POLICY IF EXISTS "Admins view all coupon uses" ON public.coupon_uses;
CREATE POLICY "Admins view all coupon uses"
ON public.coupon_uses
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ================================================================
-- 8. ATUALIZAR VALIDATION TRIGGER DE CAMPAIGNS
-- ================================================================

-- Atualizar função de validação para usar taxa total
CREATE OR REPLACE FUNCTION public.validate_campaign_percentages()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_platform_pct numeric;
  v_available numeric;
BEGIN
  -- Buscar taxa total (fixa + variável)
  v_platform_pct := public.get_total_platform_percentage();
  v_available := 100 - v_platform_pct;

  -- Sempre definir porcentagem da plataforma
  NEW.platform_percentage := v_platform_pct;

  -- Se não há organização, todo disponível vai para fotógrafo
  IF NEW.organization_id IS NULL THEN
    NEW.photographer_percentage := v_available;
    NEW.organization_percentage := 0;
  ELSE
    -- Se apenas um lado fornecido, calcular o outro
    IF NEW.photographer_percentage IS NULL AND NEW.organization_percentage IS NOT NULL THEN
      NEW.photographer_percentage := v_available - NEW.organization_percentage;
    ELSIF NEW.organization_percentage IS NULL AND NEW.photographer_percentage IS NOT NULL THEN
      NEW.organization_percentage := v_available - NEW.photographer_percentage;
    END IF;

    -- Validar soma exata
    IF (NEW.photographer_percentage + NEW.organization_percentage) != v_available THEN
      RAISE EXCEPTION 'Fotógrafo + Organização deve somar % (total: %)', v_available, (NEW.photographer_percentage + NEW.organization_percentage);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ================================================================
-- 9. DADOS EXEMPLO (OPCIONAL - REMOVER EM PRODUÇÃO)
-- ================================================================

-- Cupom exemplo 1: 10% de desconto
INSERT INTO public.coupons (code, type, value, description, max_uses, min_purchase_amount, is_active)
VALUES (
  'BEMVINDO10',
  'percentage',
  10,
  'Cupom de boas-vindas - 10% de desconto',
  100,
  50.00,
  true
) ON CONFLICT (code) DO NOTHING;

-- Cupom exemplo 2: R$ 20 de desconto
INSERT INTO public.coupons (code, type, value, description, end_date, max_uses, is_active)
VALUES (
  'PROMO20',
  'fixed',
  20.00,
  'Promoção especial - R$ 20 off',
  now() + interval '30 days',
  50,
  true
) ON CONFLICT (code) DO NOTHING;

-- ================================================================
-- 10. VIEWS ÚTEIS
-- ================================================================

-- View: Estatísticas de cupons
CREATE OR REPLACE VIEW public.coupon_stats AS
SELECT 
  c.id,
  c.code,
  c.type,
  c.value,
  c.max_uses,
  c.current_uses,
  c.is_active,
  c.start_date,
  c.end_date,
  COUNT(cu.id) AS total_uses,
  COALESCE(SUM(cu.discount_amount), 0) AS total_discount_given,
  COALESCE(SUM(cu.original_amount), 0) AS total_original_value,
  COALESCE(SUM(cu.final_amount), 0) AS total_final_value,
  COUNT(DISTINCT cu.user_id) AS unique_users
FROM public.coupons c
LEFT JOIN public.coupon_uses cu ON c.id = cu.coupon_id
GROUP BY c.id;

COMMENT ON VIEW public.coupon_stats IS 'Estatísticas de uso de cupons';

-- ================================================================
-- GRANTS
-- ================================================================

GRANT SELECT ON public.coupon_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_platform_percentage() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, uuid, numeric) TO authenticated;
