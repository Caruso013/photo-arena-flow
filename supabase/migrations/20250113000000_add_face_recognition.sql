-- Migration: Adicionar suporte a reconhecimento facial
-- Tabela para armazenar descritores faciais das fotos

-- Tabela para descritores faciais extraídos das fotos
CREATE TABLE IF NOT EXISTS photo_face_descriptors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  descriptor FLOAT8[] NOT NULL, -- Array de números (embedding facial 128 ou 512 dimensões)
  confidence FLOAT DEFAULT 1.0, -- Confiança da detecção (0-1)
  bounding_box JSONB, -- Posição do rosto na foto: {x, y, width, height}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT unique_photo_face UNIQUE(photo_id, id)
);

-- Tabela para descritores faciais dos usuários (opcional, para busca rápida)
CREATE TABLE IF NOT EXISTS user_face_descriptors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  descriptor FLOAT8[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_photo_face_descriptors_photo_id ON photo_face_descriptors(photo_id);
CREATE INDEX IF NOT EXISTS idx_user_face_descriptors_user_id ON user_face_descriptors(user_id);

-- RLS Policies
ALTER TABLE photo_face_descriptors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_face_descriptors ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem ler descritores de fotos (para busca)
CREATE POLICY "Anyone can read photo face descriptors"
ON photo_face_descriptors FOR SELECT
USING (true);

-- Política: Apenas fotógrafos/admins podem inserir descritores
CREATE POLICY "Photographers can insert photo face descriptors"
ON photo_face_descriptors FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM photos p
    INNER JOIN campaigns c ON p.campaign_id = c.id
    WHERE p.id = photo_face_descriptors.photo_id
    AND c.photographer_id = auth.uid()
  )
);

-- Política: Usuários podem gerenciar seus próprios descritores
CREATE POLICY "Users can manage their own face descriptors"
ON user_face_descriptors FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Comentários
COMMENT ON TABLE photo_face_descriptors IS 'Armazena embeddings faciais (descritores) extraídos das fotos para reconhecimento facial';
COMMENT ON TABLE user_face_descriptors IS 'Armazena embeddings faciais dos usuários para busca rápida de suas fotos';
COMMENT ON COLUMN photo_face_descriptors.descriptor IS 'Vetor de características faciais (128 ou 512 dimensões dependendo do modelo)';
COMMENT ON COLUMN photo_face_descriptors.bounding_box IS 'Coordenadas do rosto detectado na foto original';
