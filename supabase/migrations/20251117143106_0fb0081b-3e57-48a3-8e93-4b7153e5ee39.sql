-- Sistema de Backup de Descritores Faciais
-- Criar bucket para backups
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'face-descriptors-backup',
  'face-descriptors-backup',
  false,
  5242880, -- 5MB
  ARRAY['application/json']
)
ON CONFLICT (id) DO NOTHING;

-- RLS para o bucket de backups (apenas usuários autenticados podem fazer backup dos próprios dados)
CREATE POLICY "Users can upload their own face descriptor backups"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'face-descriptors-backup' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own face descriptor backups"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'face-descriptors-backup' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own face descriptor backups"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'face-descriptors-backup' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins podem acessar todos os backups
CREATE POLICY "Admins can view all face descriptor backups"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'face-descriptors-backup' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Tabela para registrar histórico de backups
CREATE TABLE IF NOT EXISTS public.face_descriptor_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  backup_path TEXT NOT NULL,
  descriptor_count INTEGER NOT NULL DEFAULT 0,
  file_size BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  restored_at TIMESTAMPTZ,
  is_automatic BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB
);

-- Índices para performance
CREATE INDEX idx_face_backups_user_id ON public.face_descriptor_backups(user_id);
CREATE INDEX idx_face_backups_created_at ON public.face_descriptor_backups(created_at DESC);

-- RLS para histórico de backups
ALTER TABLE public.face_descriptor_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own backup history"
ON public.face_descriptor_backups FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own backup records"
ON public.face_descriptor_backups FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all backup history"
ON public.face_descriptor_backups FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Função para limpar backups antigos (manter últimos 5 por usuário)
CREATE OR REPLACE FUNCTION public.cleanup_old_face_backups()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Para cada usuário, manter apenas os 5 backups mais recentes
  DELETE FROM public.face_descriptor_backups
  WHERE id IN (
    SELECT id FROM (
      SELECT 
        id,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
      FROM public.face_descriptor_backups
    ) t
    WHERE t.rn > 5
  );
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_face_backups() IS 'Remove backups antigos, mantendo os 5 mais recentes por usuário';
