-- Adicionar 'organizer' ao enum de roles
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'organizer' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE user_role ADD VALUE 'organizer';
  END IF;
END $$;

-- Adicionar campos de organização à tabela campaigns se não existirem
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS organization_percentage integer DEFAULT 0;

-- Adicionar constraint de validação para organization_percentage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'campaigns_organization_percentage_check'
  ) THEN
    ALTER TABLE campaigns 
    ADD CONSTRAINT campaigns_organization_percentage_check 
    CHECK (organization_percentage >= 0 AND organization_percentage <= 100);
  END IF;
END $$;

-- Criar buckets de storage se não existirem
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('photos-original', 'photos-original', false),
  ('photos-watermarked', 'photos-watermarked', true),
  ('photos-thumbnails', 'photos-thumbnails', true),
  ('campaign-covers', 'campaign-covers', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas para campaign-covers
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Fotógrafos podem fazer upload de capas" ON storage.objects;
  DROP POLICY IF EXISTS "Todos podem ver capas" ON storage.objects;
  DROP POLICY IF EXISTS "Fotógrafos podem atualizar suas capas" ON storage.objects;
  DROP POLICY IF EXISTS "Fotógrafos podem deletar suas capas" ON storage.objects;
END $$;

-- Criar políticas de storage
CREATE POLICY "Fotógrafos podem fazer upload de capas"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'campaign-covers' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('photographer', 'admin')
  )
);

CREATE POLICY "Todos podem ver capas"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'campaign-covers');

CREATE POLICY "Fotógrafos podem atualizar capas"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'campaign-covers' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('photographer', 'admin')
  )
);

CREATE POLICY "Fotógrafos podem deletar capas"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'campaign-covers' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role IN ('photographer', 'admin')
  )
);