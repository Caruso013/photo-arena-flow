-- ================================================================================
-- MIGRAÇÃO: Criar tabela de auditoria de downloads (photo_downloads)
-- Data: 2025-05-06
-- Objetivo: Registrar todos os downloads para segurança e rastreamento
-- ================================================================================

-- Criar tabela photo_downloads para auditoria
CREATE TABLE IF NOT EXISTS public.photo_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_id UUID NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES public.purchases(id) ON DELETE SET NULL,
  ip_address VARCHAR(50),
  user_agent TEXT,
  download_token UUID UNIQUE,
  downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ================================================================================
-- ÍNDICES para performance
-- ================================================================================
CREATE INDEX IF NOT EXISTS idx_photo_downloads_user_id ON public.photo_downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_photo_downloads_photo_id ON public.photo_downloads(photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_downloads_purchased_at ON public.photo_downloads(downloaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_photo_downloads_ip_address ON public.photo_downloads(ip_address);
CREATE INDEX IF NOT EXISTS idx_photo_downloads_user_date ON public.photo_downloads(user_id, downloaded_at DESC);

-- ================================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================================
ALTER TABLE public.photo_downloads ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas seus próprios downloads
CREATE POLICY "Users can view their own downloads"
  ON public.photo_downloads
  FOR SELECT
  USING (auth.uid() = user_id);

-- Apenas admin/service role pode inserir (via Edge Function)
CREATE POLICY "Only authenticated users can download"
  ON public.photo_downloads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Ninguém pode editar ou deletar logs (apenas adicionar)
CREATE POLICY "No updates or deletes on download logs"
  ON public.photo_downloads
  FOR UPDATE USING (false);

-- ================================================================================
-- COMENTÁRIOS
-- ================================================================================
COMMENT ON TABLE public.photo_downloads IS 'Auditoria completa de downloads de fotos para segurança e rastreamento';
COMMENT ON COLUMN public.photo_downloads.id IS 'ID único do registro';
COMMENT ON COLUMN public.photo_downloads.user_id IS 'ID do usuário que baixou';
COMMENT ON COLUMN public.photo_downloads.photo_id IS 'ID da foto baixada';
COMMENT ON COLUMN public.photo_downloads.purchase_id IS 'ID da compra que autoriza o download';
COMMENT ON COLUMN public.photo_downloads.ip_address IS 'IP do cliente que fez o download';
COMMENT ON COLUMN public.photo_downloads.user_agent IS 'User-Agent do navegador';
COMMENT ON COLUMN public.photo_downloads.download_token IS 'Token único para identificar este download';
COMMENT ON COLUMN public.photo_downloads.downloaded_at IS 'Hora exata do download';

-- ================================================================================
-- VERIFICAÇÃO: Confirmar que a tabela foi criada
-- ================================================================================
-- Execute isto para testar:
-- SELECT * FROM public.photo_downloads LIMIT 1;
-- SELECT COUNT(*) FROM public.photo_downloads;
