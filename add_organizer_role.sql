-- =====================================================
-- ADD 'organizer' ROLE TO user_role ENUM
-- =====================================================
-- 
-- Este script adiciona o valor 'organizer' ao enum user_role
-- Necessário para suportar perfis de organizadores
-- =====================================================

-- 1. ADICIONAR 'organizer' AO ENUM user_role
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'organizer';

-- 2. VERIFICAR SE FOI ADICIONADO
-- Deve retornar: user, photographer, admin, organization, organizer
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
  SELECT oid 
  FROM pg_type 
  WHERE typname = 'user_role'
)
ORDER BY enumsortorder;

-- =====================================================
-- ATUALIZAR POLÍTICAS RLS (se necessário)
-- =====================================================

-- Verificar políticas que referenciam user_role
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles';

-- Se houver políticas que precisam incluir 'organizer', 
-- elas precisarão ser atualizadas manualmente

-- =====================================================
-- INSTRUÇÕES
-- =====================================================
--
-- 1. Execute este script no Supabase Dashboard → SQL Editor
-- 2. Verifique que 'organizer' foi adicionado ao enum
-- 3. Atualize os types TypeScript executando:
--    npx supabase gen types typescript --project-id <seu-project-id> > src/integrations/supabase/types.ts
-- 4. Reinicie o servidor de desenvolvimento
--
-- =====================================================
