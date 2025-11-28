-- Adicionar coluna is_featured na tabela photos
ALTER TABLE public.photos 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;

-- Criar índice para melhorar performance nas consultas de fotos em destaque
CREATE INDEX IF NOT EXISTS idx_photos_featured 
ON public.photos(is_featured, created_at DESC) 
WHERE is_featured = true AND is_available = true;

-- Comentário explicativo
COMMENT ON COLUMN public.photos.is_featured IS 'Indica se a foto foi marcada como destaque pelo fotógrafo para aparecer na página de destaques';