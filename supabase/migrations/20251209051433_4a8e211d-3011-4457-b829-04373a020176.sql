-- =====================================================
-- CORREÇÃO DE SECURITY DEFINER VIEWS
-- Convertendo para SECURITY INVOKER (padrão mais seguro)
-- =====================================================

-- 1. Recriar public_profiles com SECURITY INVOKER
DROP VIEW IF EXISTS public_profiles CASCADE;
CREATE VIEW public_profiles 
WITH (security_invoker = true)
AS SELECT 
  id,
  full_name,
  avatar_url,
  role,
  created_at
FROM profiles;

-- 2. Recriar public_profiles_safe com SECURITY INVOKER
DROP VIEW IF EXISTS public_profiles_safe CASCADE;
CREATE VIEW public_profiles_safe 
WITH (security_invoker = true)
AS SELECT 
  id,
  full_name,
  avatar_url,
  role,
  created_at
FROM profiles
WHERE role IN ('photographer'::user_role, 'organizer'::user_role, 'admin'::user_role);

-- 3. Recriar campaign_revenue_distribution com SECURITY INVOKER
DROP VIEW IF EXISTS campaign_revenue_distribution CASCADE;
CREATE VIEW campaign_revenue_distribution 
WITH (security_invoker = true)
AS SELECT 
  id,
  title,
  platform_percentage,
  photographer_percentage,
  organization_percentage,
  organization_id,
  photographer_id,
  9.00 AS platform_amount_example,
  (photographer_percentage * 1.0) AS photographer_amount_example,
  (COALESCE(organization_percentage, 0) * 1.0) AS organization_amount_example,
  CASE
    WHEN organization_id IS NULL THEN 'Sem organizacao (Fotografo: 91%, Plataforma: 9%)'::text
    ELSE (('Com organizacao (Fotografo: ' || photographer_percentage || '%, Organizacao: ' || COALESCE(organization_percentage, 0) || '%, Plataforma: 9%)')::text)
  END AS revenue_split_description
FROM campaigns;

-- 4. Recriar campaign_revenue_split_view com SECURITY INVOKER
DROP VIEW IF EXISTS campaign_revenue_split_view CASCADE;
CREATE VIEW campaign_revenue_split_view 
WITH (security_invoker = true)
AS SELECT 
  c.id,
  c.title,
  c.photographer_id,
  c.organization_id,
  c.photographer_percentage,
  c.organization_percentage,
  (100 - COALESCE(c.photographer_percentage, 0) - COALESCE(c.organization_percentage, 0)) AS platform_percentage,
  CASE
    WHEN (c.photographer_percentage + COALESCE(c.organization_percentage, 0)) = 100 THEN 'Válido (sem taxa plataforma)'::text
    WHEN (c.photographer_percentage + COALESCE(c.organization_percentage, 0)) < 100 THEN format('Válido (Plataforma: %s%%)'::text, (100 - c.photographer_percentage - COALESCE(c.organization_percentage, 0)))
    ELSE 'ERRO: Soma > 100%'::text
  END AS validation_status,
  p.full_name AS photographer_name,
  o.name AS organization_name
FROM campaigns c
LEFT JOIN profiles p ON c.photographer_id = p.id
LEFT JOIN organizations o ON c.organization_id = o.id
ORDER BY c.created_at DESC;

-- 5. Recriar campaigns_for_home com SECURITY INVOKER
DROP VIEW IF EXISTS campaigns_for_home CASCADE;
CREATE VIEW campaigns_for_home 
WITH (security_invoker = true)
AS SELECT 
  c.id,
  c.photographer_id,
  c.title,
  c.description,
  c.event_date,
  c.location,
  c.cover_image_url,
  c.is_active,
  c.created_at,
  c.updated_at,
  c.organization_id,
  c.platform_percentage,
  c.photographer_percentage,
  c.organization_percentage,
  c.progressive_discount_enabled,
  c.short_code,
  count(DISTINCT p.id) AS photo_count,
  count(DISTINCT se.id) AS album_count
FROM campaigns c
LEFT JOIN photos p ON p.campaign_id = c.id AND p.is_available = true
LEFT JOIN sub_events se ON se.campaign_id = c.id AND se.is_active = true
WHERE c.is_active = true
GROUP BY c.id
HAVING count(DISTINCT p.id) >= 5
ORDER BY c.created_at DESC;

-- 6. Recriar coupon_stats com SECURITY INVOKER
DROP VIEW IF EXISTS coupon_stats CASCADE;
CREATE VIEW coupon_stats 
WITH (security_invoker = true)
AS SELECT 
  c.id,
  c.code,
  c.type,
  c.value,
  c.max_uses,
  c.current_uses,
  c.is_active,
  c.start_date,
  c.end_date,
  count(cu.id) AS total_uses,
  COALESCE(sum(cu.discount_amount), 0) AS total_discount_given,
  COALESCE(sum(cu.original_amount), 0) AS total_original_value,
  COALESCE(sum(cu.final_amount), 0) AS total_final_value,
  count(DISTINCT cu.user_id) AS unique_users
FROM coupons c
LEFT JOIN coupon_uses cu ON c.id = cu.coupon_id
GROUP BY c.id;

-- 7. Recriar revenue_shares_with_correct_photographer com SECURITY INVOKER
DROP VIEW IF EXISTS revenue_shares_with_correct_photographer CASCADE;
CREATE VIEW revenue_shares_with_correct_photographer 
WITH (security_invoker = true)
AS SELECT 
  rs.id,
  rs.purchase_id,
  rs.photographer_amount,
  rs.platform_amount,
  rs.organization_amount,
  p.photographer_id AS correct_photographer_id,
  p.status AS purchase_status,
  p.created_at AS purchase_created_at,
  p.photo_id,
  prof.full_name AS photographer_name
FROM revenue_shares rs
JOIN purchases p ON rs.purchase_id = p.id
JOIN profiles prof ON p.photographer_id = prof.id;

-- 8. scheduled_cleanup_jobs usa cron.job, não precisa RLS (mantém como está)

-- =====================================================
-- TABELA DE LOGS DE WEBHOOK PARA AUDITORIA
-- =====================================================
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  payment_id text,
  merchant_order_id text,
  signature_valid boolean DEFAULT false,
  ip_address text,
  user_agent text,
  request_headers jsonb,
  request_body jsonb,
  response_status integer,
  error_message text,
  processed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Índices para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_webhook_logs_payment_id ON public.webhook_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_signature_valid ON public.webhook_logs(signature_valid);

-- RLS para webhook_logs
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver logs
CREATE POLICY "Admins can view webhook logs"
ON public.webhook_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

-- Service role pode inserir (usado pelo edge function)
CREATE POLICY "Service role can insert webhook logs"
ON public.webhook_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Limpar logs antigos automaticamente (manter 30 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.webhook_logs
  WHERE created_at < now() - interval '30 days';
END;
$$;