-- Verificar se as Edge Functions estão configuradas
-- Execute estas queries no Supabase SQL Editor para verificar o status

-- 1. Verificar se a tabela photographer_applications existe
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'photographer_applications'
ORDER BY ordinal_position;

-- 2. Verificar políticas RLS
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'photographer_applications';

-- 3. Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'photographer_applications';

-- 4. Testar inserção de dados (substitua pelo seu user_id real)
-- INSERT INTO photographer_applications (
--     user_id,
--     portfolio_url,
--     experience_years,
--     equipment,
--     message
-- ) VALUES (
--     'seu-user-id-aqui',
--     'https://example.com/portfolio',
--     3,
--     'Canon EOS R5, Lentes 24-70mm',
--     'Teste de candidatura'
-- );

-- 5. Verificar estrutura da tabela profiles
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;