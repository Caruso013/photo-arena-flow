-- 1. Adicionar coluna de taxa variável individual por fotógrafo
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS photographer_platform_percentage NUMERIC DEFAULT NULL;

COMMENT ON COLUMN profiles.photographer_platform_percentage IS 'Taxa customizada da plataforma para fotógrafos com parceria (7-9%). NULL = usa taxa padrão do sistema';

-- 2. Adicionar constraint para validar taxa entre 7 e 9
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS check_photographer_percentage_range;

ALTER TABLE profiles 
ADD CONSTRAINT check_photographer_percentage_range 
CHECK (photographer_platform_percentage IS NULL OR (photographer_platform_percentage >= 7 AND photographer_platform_percentage <= 9));

-- 3. Adicionar coluna photo_count em sub_events para controle de mínimo de fotos
ALTER TABLE sub_events 
ADD COLUMN IF NOT EXISTS photo_count INTEGER DEFAULT 0;

COMMENT ON COLUMN sub_events.photo_count IS 'Contador de fotos no álbum. Álbum só fica visível com 5+ fotos';

-- 4. Função para atualizar contador de fotos ao inserir/deletar
CREATE OR REPLACE FUNCTION update_sub_event_photo_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.sub_event_id IS NOT NULL THEN
    UPDATE sub_events 
    SET photo_count = photo_count + 1 
    WHERE id = NEW.sub_event_id;
  ELSIF TG_OP = 'DELETE' AND OLD.sub_event_id IS NOT NULL THEN
    UPDATE sub_events 
    SET photo_count = GREATEST(0, photo_count - 1)
    WHERE id = OLD.sub_event_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger para atualizar contador automaticamente
DROP TRIGGER IF EXISTS trigger_update_sub_event_photo_count ON photos;
CREATE TRIGGER trigger_update_sub_event_photo_count
AFTER INSERT OR DELETE ON photos
FOR EACH ROW
EXECUTE FUNCTION update_sub_event_photo_count();

-- 6. Inicializar contador para sub_events existentes
UPDATE sub_events se
SET photo_count = (
  SELECT COUNT(*)
  FROM photos p
  WHERE p.sub_event_id = se.id
);

-- 7. Função atualizada para calcular taxa da plataforma considerando taxa individual
CREATE OR REPLACE FUNCTION get_photographer_platform_percentage(p_photographer_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_custom_percentage NUMERIC;
BEGIN
  -- Buscar taxa customizada do fotógrafo
  SELECT photographer_platform_percentage INTO v_custom_percentage
  FROM profiles
  WHERE id = p_photographer_id;
  
  -- Se fotógrafo tem taxa customizada, usar ela
  IF v_custom_percentage IS NOT NULL THEN
    RETURN v_custom_percentage;
  END IF;
  
  -- Caso contrário, usar taxa do sistema
  RETURN get_total_platform_percentage();
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_photographer_platform_percentage(UUID) IS 'Retorna a taxa da plataforma para um fotógrafo específico. Prioriza taxa customizada se existir, senão usa taxa padrão do sistema';

-- 8. Atualizar função de cálculo de revenue shares para usar taxa individual
CREATE OR REPLACE FUNCTION calculate_revenue_shares()
RETURNS TRIGGER AS $$
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
    c.photographer_percentage,
    COALESCE(c.organization_percentage, 0)
  INTO 
    v_campaign_id,
    v_organization_id,
    v_photographer_pct,
    v_organization_pct
  FROM photos p
  JOIN campaigns c ON p.campaign_id = c.id
  WHERE p.id = NEW.photo_id;

  -- Calcular taxa da plataforma usando função que considera taxa individual do fotógrafo
  v_platform_pct := get_photographer_platform_percentage(NEW.photographer_id);

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';