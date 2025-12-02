-- ===================================
-- OTIMIZAÇÃO DE PERFORMANCE E CAPAS
-- ===================================

-- 1. Índices compostos para queries mais rápidas
CREATE INDEX IF NOT EXISTS idx_campaigns_active_created 
ON campaigns(is_active, created_at DESC) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_photos_campaign_available_sequence 
ON photos(campaign_id, is_available, upload_sequence) 
WHERE is_available = true;

CREATE INDEX IF NOT EXISTS idx_campaign_photographers_active 
ON campaign_photographers(photographer_id, is_active) 
WHERE is_active = true;

-- 2. Função para auto-atualizar capa da campanha quando não existe
CREATE OR REPLACE FUNCTION update_campaign_cover_if_empty()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a campanha não tem capa definida, usar a foto que foi inserida
  IF EXISTS (
    SELECT 1 FROM campaigns 
    WHERE id = NEW.campaign_id 
    AND (cover_image_url IS NULL OR cover_image_url = '')
    AND NEW.is_available = true
  ) THEN
    UPDATE campaigns 
    SET cover_image_url = NEW.watermarked_url,
        updated_at = now()
    WHERE id = NEW.campaign_id
    AND (cover_image_url IS NULL OR cover_image_url = '');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger para auto-atualizar capa
DROP TRIGGER IF EXISTS trigger_update_campaign_cover_on_photo_insert ON photos;
CREATE TRIGGER trigger_update_campaign_cover_on_photo_insert
  AFTER INSERT ON photos
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_cover_if_empty();

-- 4. Atualizar campanhas existentes sem capa (usar primeira foto disponível)
UPDATE campaigns c
SET cover_image_url = (
  SELECT p.watermarked_url
  FROM photos p
  WHERE p.campaign_id = c.id
    AND p.is_available = true
  ORDER BY p.upload_sequence ASC
  LIMIT 1
)
WHERE (c.cover_image_url IS NULL OR c.cover_image_url = '')
  AND EXISTS (
    SELECT 1 FROM photos p 
    WHERE p.campaign_id = c.id 
    AND p.is_available = true
  );

-- 5. Comentários
COMMENT ON INDEX idx_campaigns_active_created IS 'Otimiza listagem de campanhas ativas ordenadas por data';
COMMENT ON INDEX idx_photos_campaign_available_sequence IS 'Otimiza busca de primeira foto para capa';
COMMENT ON INDEX idx_campaign_photographers_active IS 'Otimiza filtro por fotógrafo';
COMMENT ON FUNCTION update_campaign_cover_if_empty() IS 'Auto-define capa da campanha usando primeira foto';
