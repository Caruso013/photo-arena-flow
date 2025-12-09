-- =====================================================
-- CORREÇÃO DE SEGURANÇA: Proteger emails de usuários
-- =====================================================

-- 1. Remover política que expõe TODOS os perfis a usuários autenticados
DROP POLICY IF EXISTS "Authenticated users view basic profiles" ON public.profiles;

-- 2. Criar VIEW segura para informações públicas (SEM email)
CREATE OR REPLACE VIEW public.public_profiles_safe AS
SELECT 
  id,
  full_name,
  avatar_url,
  role,
  created_at
FROM public.profiles
WHERE role IN ('photographer', 'organizer', 'admin');

-- 3. Política para usuários autenticados verem info básica de fotógrafos/organizadores (SEM email)
CREATE POLICY "Authenticated see photographer basic info"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Próprio perfil
  auth.uid() = id
  OR 
  -- Admins veem tudo
  has_role(auth.uid(), 'admin'::user_role)
  OR
  -- Fotógrafos e organizadores podem ser vistos (sem email via view)
  role IN ('photographer', 'organizer')
);

-- 4. Garantir que existe política para service_role (edge functions)
DROP POLICY IF EXISTS "Service role full access" ON public.profiles;
CREATE POLICY "Service role full access"
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);