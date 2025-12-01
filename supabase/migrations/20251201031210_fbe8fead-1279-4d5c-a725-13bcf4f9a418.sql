-- Trigger para definir primeira foto como capa do evento automaticamente
-- Se o evento não tiver capa, a primeira foto enviada será definida como capa

CREATE OR REPLACE FUNCTION set_first_photo_as_campaign_cover()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se a campanha não tem capa definida
  IF EXISTS (
    SELECT 1 FROM campaigns 
    WHERE id = NEW.campaign_id 
    AND (cover_image_url IS NULL OR cover_image_url = '')
  ) THEN
    -- Definir a foto recém-inserida como capa da campanha
    UPDATE campaigns
    SET cover_image_url = NEW.watermarked_url
    WHERE id = NEW.campaign_id;
    
    RAISE NOTICE 'Primeira foto definida como capa do evento: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger que executa após inserção de foto
DROP TRIGGER IF EXISTS trigger_set_first_photo_as_cover ON photos;
CREATE TRIGGER trigger_set_first_photo_as_cover
  AFTER INSERT ON photos
  FOR EACH ROW
  EXECUTE FUNCTION set_first_photo_as_campaign_cover();

COMMENT ON FUNCTION set_first_photo_as_campaign_cover() IS 'Define automaticamente a primeira foto enviada como capa do evento se ele não tiver capa';