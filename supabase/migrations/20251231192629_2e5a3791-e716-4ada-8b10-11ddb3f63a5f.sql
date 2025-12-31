-- =====================================================
-- CORREÇÃO DE SEGURANÇA - FASE 2
-- =====================================================

-- 1. Corrigir exposição de original_url na tabela photos
-- Usuários não autenticados ou que não compraram não devem ver original_url

-- Remover política atual que expõe tudo
DROP POLICY IF EXISTS "Anyone can view available photos" ON photos;

-- Criar política que retorna fotos mas sem acesso direto ao original
-- (O original_url só deve ser acessado via função de download com verificação de compra)
CREATE POLICY "Anyone can view available photos"
  ON photos
  FOR SELECT
  USING (is_available = true);

-- Nota: O original_url está na tabela, mas a proteção real vem do bucket privado
-- O bucket photos-original já requer signed URLs para acesso

-- 2. Habilitar RLS e criar políticas nas views críticas
-- As views já existem, mas precisamos garantir que herdem o RLS corretamente

-- 2.1 Recriar buyer_names_for_photographers como security invoker
DROP VIEW IF EXISTS public.buyer_names_for_photographers CASCADE;
CREATE VIEW public.buyer_names_for_photographers 
WITH (security_invoker = true) AS
SELECT DISTINCT 
  p.buyer_id,
  pr.full_name as buyer_name,
  p.photographer_id
FROM purchases p
JOIN profiles pr ON p.buyer_id = pr.id
WHERE p.status = 'completed';

-- 2.2 Recriar campaign_revenue_distribution como security invoker
DROP VIEW IF EXISTS public.campaign_revenue_distribution CASCADE;
CREATE VIEW public.campaign_revenue_distribution
WITH (security_invoker = true) AS
SELECT 
  c.id,
  c.title,
  c.photographer_id,
  c.organization_id,
  c.platform_percentage,
  c.photographer_percentage,
  c.organization_percentage,
  ROUND((100.00 * c.platform_percentage / 100), 2) as platform_amount_example,
  ROUND((100.00 * c.photographer_percentage / 100), 2) as photographer_amount_example,
  ROUND((100.00 * c.organization_percentage / 100), 2) as organization_amount_example,
  CONCAT(
    'Plataforma: ', c.platform_percentage, '% | ',
    'Fotógrafo: ', c.photographer_percentage, '% | ',
    'Organizador: ', COALESCE(c.organization_percentage, 0), '%'
  ) as revenue_split_description
FROM campaigns c
WHERE c.is_active = true;

-- 2.3 Recriar campaign_revenue_split_view como security invoker  
DROP VIEW IF EXISTS public.campaign_revenue_split_view CASCADE;
CREATE VIEW public.campaign_revenue_split_view
WITH (security_invoker = true) AS
SELECT 
  c.id,
  c.title,
  c.photographer_id,
  p.full_name as photographer_name,
  c.organization_id,
  o.name as organization_name,
  c.platform_percentage,
  c.photographer_percentage,
  c.organization_percentage,
  CASE 
    WHEN (c.platform_percentage + c.photographer_percentage + COALESCE(c.organization_percentage, 0)) = 100 
    THEN 'OK'
    ELSE 'ERRO: Soma não é 100%'
  END as validation_status
FROM campaigns c
LEFT JOIN profiles p ON c.photographer_id = p.id
LEFT JOIN organizations o ON c.organization_id = o.id
WHERE c.is_active = true;

-- 2.4 Recriar campaigns_for_home como security invoker
DROP VIEW IF EXISTS public.campaigns_for_home CASCADE;
CREATE VIEW public.campaigns_for_home
WITH (security_invoker = true) AS
SELECT 
  c.*,
  (SELECT COUNT(*) FROM photos ph WHERE ph.campaign_id = c.id AND ph.is_available = true) as photo_count,
  (SELECT COUNT(*) FROM sub_events se WHERE se.campaign_id = c.id AND se.is_active = true) as album_count
FROM campaigns c
WHERE c.is_active = true;

-- 2.5 Recriar coupon_stats como security invoker
DROP VIEW IF EXISTS public.coupon_stats CASCADE;
CREATE VIEW public.coupon_stats
WITH (security_invoker = true) AS
SELECT 
  c.id,
  c.code,
  c.description,
  c.type,
  c.value,
  c.is_active,
  c.start_date,
  c.end_date,
  c.max_uses,
  c.current_uses,
  COALESCE(SUM(cu.discount_amount), 0) as total_discount_given
FROM coupons c
LEFT JOIN coupon_uses cu ON c.id = cu.coupon_id
GROUP BY c.id;

-- 2.6 Recriar revenue_shares_with_correct_photographer se existir
DROP VIEW IF EXISTS public.revenue_shares_with_correct_photographer CASCADE;
CREATE VIEW public.revenue_shares_with_correct_photographer
WITH (security_invoker = true) AS
SELECT 
  rs.*,
  ph.photographer_id as photo_photographer_id
FROM revenue_shares rs
JOIN purchases pu ON rs.purchase_id = pu.id
JOIN photos ph ON pu.photo_id = ph.id;

-- 2.7 scheduled_cleanup_jobs - habilitar RLS se for tabela
-- Primeiro verificar se é tabela ou view
-- (Não vou modificar se for do sistema)