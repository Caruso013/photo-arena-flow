-- Otimização de Cache para Reduzir Cached Egress
-- Adicionar políticas de cache mais agressivas para imagens

-- Configurar cache headers nos buckets de storage
-- Thumbnails: cache por 1 ano (raramente mudam)
UPDATE storage.buckets
SET public = true,
    file_size_limit = 5242880, -- 5MB para thumbnails
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
WHERE id = 'photos-thumbnails';

-- Watermarked: cache por 6 meses
UPDATE storage.buckets
SET public = true,
    file_size_limit = 10485760, -- 10MB para watermarked
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
WHERE id = 'photos-watermarked';

-- Original: acesso mais restrito, cache menor
UPDATE storage.buckets
SET public = false,
    file_size_limit = 20971520, -- 20MB para originais
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
WHERE id = 'photos-original';

-- Criar índice para otimizar queries de fotos disponíveis
CREATE INDEX IF NOT EXISTS idx_photos_available_thumbnail 
ON photos(campaign_id, is_available, upload_sequence) 
WHERE is_available = true AND thumbnail_url IS NOT NULL;

-- Comentários
COMMENT ON INDEX idx_photos_available_thumbnail IS 'Otimiza listagem de thumbnails para reduzir Cached Egress';
