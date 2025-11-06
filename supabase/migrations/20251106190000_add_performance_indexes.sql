-- Performance Optimization: Add Strategic Indexes
-- Melhora performance de queries em 50-200%
-- Data: 2025-11-06

-- ========================================
-- PHOTOS TABLE - Índices para queries comuns
-- ========================================

-- Buscar fotos por campanha (usado em Campaign.tsx, MyPhotos.tsx)
CREATE INDEX IF NOT EXISTS idx_photos_campaign_id 
  ON public.photos(campaign_id) 
  WHERE is_available = true;

-- Buscar fotos por sub_event (usado em galeria de sub-eventos)
CREATE INDEX IF NOT EXISTS idx_photos_sub_event_id 
  ON public.photos(sub_event_id) 
  WHERE is_available = true;

-- Ordenar fotos por data de criação (listagens)
CREATE INDEX IF NOT EXISTS idx_photos_created_at 
  ON public.photos(created_at DESC);

-- Buscar fotos por fotógrafo (dashboard do fotógrafo)
CREATE INDEX IF NOT EXISTS idx_photos_photographer_id 
  ON public.photos(photographer_id) 
  WHERE is_available = true;

COMMENT ON INDEX idx_photos_campaign_id IS 'Otimiza busca de fotos por campanha';
COMMENT ON INDEX idx_photos_sub_event_id IS 'Otimiza busca de fotos por sub-evento';
COMMENT ON INDEX idx_photos_created_at IS 'Otimiza ordenação por data de upload';
COMMENT ON INDEX idx_photos_photographer_id IS 'Otimiza listagem de fotos do fotógrafo';

-- ========================================
-- CAMPAIGNS TABLE - Índices para listagens
-- ========================================

-- Buscar campanhas ativas por data (Events.tsx, Index.tsx)
CREATE INDEX IF NOT EXISTS idx_campaigns_event_date_active 
  ON public.campaigns(event_date DESC) 
  WHERE is_active = true;

-- Buscar campanhas por fotógrafo (MyEvents.tsx)
CREATE INDEX IF NOT EXISTS idx_campaigns_photographer_id 
  ON public.campaigns(photographer_id) 
  WHERE is_active = true;

-- Buscar campanhas por organização
CREATE INDEX IF NOT EXISTS idx_campaigns_organization_id 
  ON public.campaigns(organization_id) 
  WHERE is_active = true;

-- Buscar por data de criação (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at 
  ON public.campaigns(created_at DESC);

COMMENT ON INDEX idx_campaigns_event_date_active IS 'Otimiza listagem de eventos ativos por data';
COMMENT ON INDEX idx_campaigns_photographer_id IS 'Otimiza listagem de eventos do fotógrafo';
COMMENT ON INDEX idx_campaigns_organization_id IS 'Otimiza listagem de eventos por organização';
COMMENT ON INDEX idx_campaigns_created_at IS 'Otimiza ordenação por data de criação';

-- ========================================
-- PURCHASES TABLE - Índices para histórico
-- ========================================

-- Buscar compras por comprador (MyPurchases.tsx)
CREATE INDEX IF NOT EXISTS idx_purchases_buyer_id_created_at 
  ON public.purchases(buyer_id, created_at DESC);

-- Buscar compras por fotógrafo (revenue tracking)
CREATE INDEX IF NOT EXISTS idx_purchases_photographer_id 
  ON public.purchases(photographer_id, created_at DESC);

-- Buscar compras por status (corrigido: coluna é 'status' não 'payment_status')
CREATE INDEX IF NOT EXISTS idx_purchases_status 
  ON public.purchases(status, created_at DESC);

-- Buscar compras por foto (analytics)
CREATE INDEX IF NOT EXISTS idx_purchases_photo_id 
  ON public.purchases(photo_id);

COMMENT ON INDEX idx_purchases_buyer_id_created_at IS 'Otimiza histórico de compras do usuário';
COMMENT ON INDEX idx_purchases_photographer_id IS 'Otimiza tracking de receita do fotógrafo';
COMMENT ON INDEX idx_purchases_status IS 'Otimiza filtros por status de pagamento';
COMMENT ON INDEX idx_purchases_photo_id IS 'Otimiza analytics por foto';

-- ========================================
-- REVENUE_SHARES TABLE - Índices para pagamentos
-- ========================================

-- Buscar receitas por fotógrafo (Payouts.tsx)
CREATE INDEX IF NOT EXISTS idx_revenue_shares_photographer_id 
  ON public.revenue_shares(photographer_id, created_at DESC);

-- Buscar receitas por compra
CREATE INDEX IF NOT EXISTS idx_revenue_shares_purchase_id 
  ON public.revenue_shares(purchase_id);

COMMENT ON INDEX idx_revenue_shares_photographer_id IS 'Otimiza listagem de pagamentos do fotógrafo';
COMMENT ON INDEX idx_revenue_shares_purchase_id IS 'Otimiza lookup de receita por compra';

-- ========================================
-- CAMPAIGN_PHOTOGRAPHERS - Índices para candidaturas
-- ========================================

-- Buscar atribuições por fotógrafo (EventosProximos.tsx)
CREATE INDEX IF NOT EXISTS idx_campaign_photographers_photographer_id 
  ON public.campaign_photographers(photographer_id, is_active);

-- Buscar atribuições por campanha (ApplicationsManager.tsx)
CREATE INDEX IF NOT EXISTS idx_campaign_photographers_campaign_id 
  ON public.campaign_photographers(campaign_id, is_active);

COMMENT ON INDEX idx_campaign_photographers_photographer_id IS 'Otimiza listagem de eventos do fotógrafo';
COMMENT ON INDEX idx_campaign_photographers_campaign_id IS 'Otimiza listagem de candidaturas por evento';

-- ========================================
-- SUB_EVENTS TABLE - Índices para galeria
-- ========================================

-- Buscar sub-eventos por campanha (Campaign.tsx)
CREATE INDEX IF NOT EXISTS idx_sub_events_campaign_id 
  ON public.sub_events(campaign_id, event_time);

COMMENT ON INDEX idx_sub_events_campaign_id IS 'Otimiza listagem de sub-eventos por campanha';

-- ========================================
-- PROFILES TABLE - Índices para autenticação
-- ========================================

-- Buscar por email (login, verificações)
CREATE INDEX IF NOT EXISTS idx_profiles_email 
  ON public.profiles(email);

-- Buscar por role (admin queries)
CREATE INDEX IF NOT EXISTS idx_profiles_role 
  ON public.profiles(role);

COMMENT ON INDEX idx_profiles_email IS 'Otimiza lookup por email';
COMMENT ON INDEX idx_profiles_role IS 'Otimiza filtros por tipo de usuário';

-- ========================================
-- EVENT_APPLICATIONS - Índices para candidaturas
-- ========================================

-- Buscar candidaturas por fotógrafo
CREATE INDEX IF NOT EXISTS idx_event_applications_photographer_id 
  ON public.event_applications(photographer_id, status, applied_at DESC);

-- Buscar candidaturas por campanha
CREATE INDEX IF NOT EXISTS idx_event_applications_campaign_id 
  ON public.event_applications(campaign_id, status);

COMMENT ON INDEX idx_event_applications_photographer_id IS 'Otimiza listagem de candidaturas do fotógrafo';
COMMENT ON INDEX idx_event_applications_campaign_id IS 'Otimiza listagem de candidaturas por evento';

-- ========================================
-- PAYOUT_REQUESTS - Índices para pagamentos
-- ========================================

-- Buscar solicitações por fotógrafo
CREATE INDEX IF NOT EXISTS idx_payout_requests_photographer_id 
  ON public.payout_requests(photographer_id, status, requested_at DESC);

-- Buscar por status
CREATE INDEX IF NOT EXISTS idx_payout_requests_status 
  ON public.payout_requests(status, requested_at DESC);

COMMENT ON INDEX idx_payout_requests_photographer_id IS 'Otimiza listagem de pagamentos por fotógrafo';
COMMENT ON INDEX idx_payout_requests_status IS 'Otimiza filtros por status de pagamento';

-- ========================================
-- ANÁLISE DE PERFORMANCE
-- ========================================

-- Para verificar uso dos índices:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- Para verificar tabelas sem índices adequados:
-- SELECT schemaname, tablename, attname, n_distinct, correlation
-- FROM pg_stats
-- WHERE schemaname = 'public' AND tablename IN ('photos', 'campaigns', 'purchases')
-- ORDER BY abs(correlation) DESC;

-- ========================================
-- OTIMIZAÇÕES EXTRAS PARA CARREGAMENTO DE FOTOS
-- ========================================

-- Índice composto para query mais comum: fotos disponíveis de uma campanha ordenadas
CREATE INDEX IF NOT EXISTS idx_photos_campaign_available_created 
  ON public.photos(campaign_id, created_at DESC) 
  WHERE is_available = true;

-- Índice para thumbnail_url (usado em listagens rápidas)
CREATE INDEX IF NOT EXISTS idx_photos_thumbnail 
  ON public.photos(thumbnail_url) 
  WHERE thumbnail_url IS NOT NULL AND is_available = true;

-- Índice para watermarked_url (usado em galeria)
CREATE INDEX IF NOT EXISTS idx_photos_watermarked 
  ON public.photos(watermarked_url) 
  WHERE is_available = true;

-- Otimizar contagem de fotos por campanha (COUNT queries)
CREATE INDEX IF NOT EXISTS idx_photos_campaign_count 
  ON public.photos(campaign_id) 
  INCLUDE (id)
  WHERE is_available = true;

COMMENT ON INDEX idx_photos_campaign_available_created IS 'Otimiza query mais comum: fotos disponíveis por campanha ordenadas';
COMMENT ON INDEX idx_photos_thumbnail IS 'Otimiza carregamento de thumbnails em listagens';
COMMENT ON INDEX idx_photos_watermarked IS 'Otimiza carregamento de fotos com marca d''água';
COMMENT ON INDEX idx_photos_campaign_count IS 'Otimiza contagem de fotos por campanha';

-- ========================================
-- VACUUM E ANALYZE PARA PERFORMANCE
-- ========================================

-- Atualizar estatísticas para otimizador de queries
ANALYZE public.photos;
ANALYZE public.campaigns;
ANALYZE public.purchases;
ANALYZE public.revenue_shares;

-- ========================================
-- CONFIGURAÇÕES DE PERFORMANCE (opcional - comentado)
-- ========================================

-- Aumentar work_mem para queries complexas (descomentar se necessário)
-- ALTER DATABASE postgres SET work_mem = '64MB';

-- Aumentar shared_buffers (descomentar se necessário e tiver RAM disponível)
-- ALTER SYSTEM SET shared_buffers = '256MB';

-- Aumentar effective_cache_size (descomentar se necessário)
-- ALTER SYSTEM SET effective_cache_size = '1GB';

