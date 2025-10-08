-- Script para verificar e corrigir políticas de Storage
-- Execute este script no SQL Editor do Supabase

-- 1. Verificar buckets existentes
SELECT * FROM storage.buckets;

-- 2. Criar buckets se não existirem
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('photos-original', 'photos-original', false),
  ('photos-watermarked', 'photos-watermarked', true),
  ('photos-thumbnails', 'photos-thumbnails', true),
  ('campaign-covers', 'campaign-covers', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Remover políticas antigas (se houver conflito)
DROP POLICY IF EXISTS "Photographers can upload original photos" ON storage.objects;
DROP POLICY IF EXISTS "Only purchased photos accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view watermarked photos" ON storage.objects;
DROP POLICY IF EXISTS "Photographers can upload watermarked photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Photographers can upload thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view campaign covers" ON storage.objects;
DROP POLICY IF EXISTS "Photographers can upload campaign covers" ON storage.objects;
DROP POLICY IF EXISTS "Avatares são visíveis por todos" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem fazer upload de avatar próprio" ON storage.objects;

-- 4. POLÍTICAS PARA PHOTOS-ORIGINAL (PRIVADO)
-- Fotógrafos e admins podem fazer upload
CREATE POLICY "Photographers and admins can upload original photos"
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'photos-original' AND (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('photographer', 'admin')
    )
  )
);

-- Apenas dono, admin e comprador podem visualizar
CREATE POLICY "Original photos access control"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'photos-original' AND (
    -- Dono pode acessar
    (storage.foldername(name))[1] = auth.uid()::text OR
    -- Admin pode acessar
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ) OR
    -- Comprador que já pagou pode acessar
    EXISTS (
      SELECT 1 FROM public.purchases p
      JOIN public.photos ph ON p.photo_id = ph.id
      WHERE p.buyer_id = auth.uid() 
      AND p.status = 'completed'
      AND ph.original_url LIKE '%' || name || '%'
    )
  )
);

-- 5. POLÍTICAS PARA PHOTOS-WATERMARKED (PÚBLICO)
CREATE POLICY "Anyone can view watermarked photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos-watermarked');

CREATE POLICY "Photographers and admins can upload watermarked photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'photos-watermarked' AND (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('photographer', 'admin')
    )
  )
);

-- 6. POLÍTICAS PARA PHOTOS-THUMBNAILS (PÚBLICO)
CREATE POLICY "Anyone can view thumbnails"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos-thumbnails');

CREATE POLICY "Photographers and admins can upload thumbnails"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'photos-thumbnails' AND (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('photographer', 'admin')
    )
  )
);

-- 7. POLÍTICAS PARA CAMPAIGN-COVERS (PÚBLICO)
CREATE POLICY "Anyone can view campaign covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'campaign-covers');

CREATE POLICY "Organizations and admins can upload campaign covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'campaign-covers' AND (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin')
    ) OR
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
);

-- 8. POLÍTICAS PARA AVATARS (PÚBLICO)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND (
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND (
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND (
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- 9. Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'objects'
ORDER BY policyname;