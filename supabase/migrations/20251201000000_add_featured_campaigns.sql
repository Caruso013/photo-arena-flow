-- Adicionar coluna is_featured para marcar eventos em destaque
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;

-- Criar índice para otimizar queries de eventos em destaque
CREATE INDEX IF NOT EXISTS idx_campaigns_featured 
ON campaigns(is_featured, created_at DESC) 
WHERE is_featured = true AND is_active = true;

-- Comentário
COMMENT ON COLUMN campaigns.is_featured IS 'Define se o evento aparece na seção de destaques da home';
