-- Sprint 2: Performance Indexes
-- Adicionar índices estratégicos para melhorar performance das queries mais comuns

-- Índice composto para buscar fotos por campanha e sequência (usado na paginação)
CREATE INDEX IF NOT EXISTS idx_photos_campaign_sequence 
ON photos(campaign_id, upload_sequence DESC, created_at DESC) 
WHERE is_available = true;

-- Índice para fotos disponíveis (queries de galeria)
CREATE INDEX IF NOT EXISTS idx_photos_available 
ON photos(is_available) 
WHERE is_available = true;

-- Índice para status de compras (filtros e estatísticas)
CREATE INDEX IF NOT EXISTS idx_purchases_status 
ON purchases(status, created_at DESC);

-- Índice composto para vendas por fotógrafo (dashboard de fotógrafo)
CREATE INDEX IF NOT EXISTS idx_purchases_photographer_status 
ON purchases(photographer_id, status, created_at DESC) 
WHERE status = 'completed';

-- Índice para revenue_shares por fotógrafo (cálculos financeiros)
CREATE INDEX IF NOT EXISTS idx_revenue_shares_photographer 
ON revenue_shares(photographer_id, created_at DESC);

-- Índice para revenue_shares por organização (dashboard de organização)
CREATE INDEX IF NOT EXISTS idx_revenue_shares_organization 
ON revenue_shares(organization_id, created_at DESC) 
WHERE organization_id IS NOT NULL;

-- Índice para campanhas ativas por data (listagem de eventos)
CREATE INDEX IF NOT EXISTS idx_campaigns_active_date 
ON campaigns(event_date DESC, created_at DESC) 
WHERE is_active = true;

-- Índice para fotógrafos atribuídos a campanhas (verificação de permissões)
CREATE INDEX IF NOT EXISTS idx_campaign_photographers_active 
ON campaign_photographers(photographer_id, campaign_id) 
WHERE is_active = true;

-- Índice para sub_events por campanha (busca de álbuns)
CREATE INDEX IF NOT EXISTS idx_sub_events_campaign 
ON sub_events(campaign_id, created_at DESC) 
WHERE is_active = true;

-- Índice para solicitações de pagamento pendentes (dashboard admin)
CREATE INDEX IF NOT EXISTS idx_payout_requests_status 
ON payout_requests(status, requested_at DESC);

COMMENT ON INDEX idx_photos_campaign_sequence IS 'Performance index for photo pagination within campaigns';
COMMENT ON INDEX idx_purchases_photographer_status IS 'Performance index for photographer earnings calculations';
COMMENT ON INDEX idx_campaigns_active_date IS 'Performance index for event listing and filtering';