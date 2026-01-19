
-- Criar políticas de storage para o bucket avatars
-- Permitir que usuários autenticados façam upload e gerenciem seus próprios avatars

-- Dropar políticas antigas se existirem para recriar
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow public viewing" ON storage.objects;
DROP POLICY IF EXISTS "avatars_authenticated_uploads" ON storage.objects;
DROP POLICY IF EXISTS "avatars_authenticated_updates" ON storage.objects;
DROP POLICY IF EXISTS "avatars_authenticated_deletes" ON storage.objects;
DROP POLICY IF EXISTS "avatars_public_view" ON storage.objects;

-- Política para INSERT (upload) - qualquer usuário autenticado pode fazer upload
CREATE POLICY "avatars_authenticated_uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

-- Política para UPDATE - qualquer usuário autenticado pode atualizar seus arquivos
CREATE POLICY "avatars_authenticated_updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars');

-- Política para DELETE - qualquer usuário autenticado pode deletar seus arquivos  
CREATE POLICY "avatars_authenticated_deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');

-- Política para SELECT - todos podem visualizar (bucket público)
CREATE POLICY "avatars_public_view"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'avatars');
