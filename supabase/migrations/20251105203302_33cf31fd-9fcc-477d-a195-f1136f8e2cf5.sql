-- Adicionar campo de sequência de upload nas fotos
ALTER TABLE photos ADD COLUMN IF NOT EXISTS upload_sequence INTEGER;

-- Criar índice para melhorar performance de ordenação
CREATE INDEX IF NOT EXISTS idx_photos_upload_sequence ON photos(campaign_id, upload_sequence);

-- Atualizar fotos existentes com sequência baseada em created_at
WITH ranked_photos AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY campaign_id ORDER BY created_at) as seq
  FROM photos
  WHERE upload_sequence IS NULL
)
UPDATE photos
SET upload_sequence = ranked_photos.seq
FROM ranked_photos
WHERE photos.id = ranked_photos.id;

-- Adicionar comentário explicativo
COMMENT ON COLUMN photos.upload_sequence IS 'Sequência de upload da foto dentro de cada campanha (1, 2, 3, ...)';
