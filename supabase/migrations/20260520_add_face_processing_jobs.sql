-- Migração: adicionar tabela de jobs de processamento facial e coluna album_id
-- Autor: assistente

-- Adiciona coluna album_id (campaign_id) em photo_face_descriptors para consultas por álbum
ALTER TABLE IF EXISTS photo_face_descriptors
ADD COLUMN IF NOT EXISTS album_id UUID;

-- Tabela de jobs para processamento assíncrono de faces
CREATE TABLE IF NOT EXISTS face_processing_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, succeeded, failed
  attempts INT NOT NULL DEFAULT 0,
  payload JSONB, -- payload opcional (ex: image_url, thumbnail_url, model)
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_face_jobs_status ON face_processing_jobs(status);
CREATE INDEX IF NOT EXISTS idx_face_jobs_created_at ON face_processing_jobs(created_at DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS face_jobs_set_timestamp ON face_processing_jobs;
CREATE TRIGGER face_jobs_set_timestamp
BEFORE UPDATE ON face_processing_jobs
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();
