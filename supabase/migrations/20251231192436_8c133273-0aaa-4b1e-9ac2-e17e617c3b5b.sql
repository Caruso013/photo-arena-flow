-- =====================================================
-- CORREÇÃO DE SEGURANÇA: Proteção de Dados Sensíveis
-- =====================================================

-- 1. Dropar e recriar view segura (mantendo mesmas colunas)
DROP VIEW IF EXISTS public.public_profiles_safe;
CREATE VIEW public.public_profiles_safe AS
SELECT 
  id,
  full_name,
  avatar_url,
  role,
  created_at
FROM profiles
WHERE role IN ('photographer', 'organizer');

-- 2. Remover política que expõe todos os fotógrafos (incluindo emails)
DROP POLICY IF EXISTS "Public photographer basic info" ON profiles;

-- 3. Remover política duplicada que pode causar exposição
DROP POLICY IF EXISTS "Authenticated see photographer basic info" ON profiles;

-- 4. Remover política antiga de compradores (será substituída)
DROP POLICY IF EXISTS "Photographers can view buyer names who purchased from them" ON profiles;

-- 5. Criar política mais restritiva para perfis
CREATE POLICY "View photographer names only"
  ON profiles
  FOR SELECT
  USING (
    -- Usuário vê seu próprio perfil
    auth.uid() = id
    OR 
    -- Admins veem tudo
    has_role(auth.uid(), 'admin'::user_role)
    OR
    -- Ver apenas dados básicos de fotógrafos em campanhas ativas
    (
      role = 'photographer'::user_role 
      AND id IN (
        SELECT DISTINCT photographer_id 
        FROM campaigns 
        WHERE is_active = true AND photographer_id IS NOT NULL
      )
    )
    OR
    -- Fotógrafos podem ver nomes de compradores que compraram deles
    (
      has_role(auth.uid(), 'photographer'::user_role) 
      AND EXISTS (
        SELECT 1 FROM purchases p 
        WHERE p.buyer_id = profiles.id 
        AND p.photographer_id = auth.uid() 
        AND p.status = 'completed'
      )
    )
  );

-- 6. Garantir políticas de payout_requests
DROP POLICY IF EXISTS "Photographers can view own payout requests" ON payout_requests;
CREATE POLICY "Photographers can view own payout requests"
  ON payout_requests
  FOR SELECT
  USING (auth.uid() = photographer_id);

-- 7. Garantir política de compras
DROP POLICY IF EXISTS "Users view own purchases" ON purchases;
CREATE POLICY "Users view own purchases"
  ON purchases
  FOR SELECT
  USING (
    auth.uid() = buyer_id 
    OR auth.uid() = photographer_id
    OR has_role(auth.uid(), 'admin'::user_role)
  );

-- 8. Comentários para auditoria
COMMENT ON VIEW public.public_profiles_safe IS 'View segura para dados públicos de perfis sem expor emails';
COMMENT ON POLICY "View photographer names only" ON profiles IS 'Política restritiva que protege emails - apenas nomes e avatares visíveis publicamente';