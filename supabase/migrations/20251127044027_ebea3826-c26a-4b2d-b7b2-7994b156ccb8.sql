-- ============================================
-- FIX CRÍTICO 1: Remover exposição pública de emails
-- ============================================

-- Remover política vulnerável que expõe todos os emails
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Criar políticas específicas e seguras
CREATE POLICY "Users view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins view all profiles" ON public.profiles
FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role));

-- ============================================
-- FIX CRÍTICO 2: Remover email de fotógrafo da view
-- ============================================

-- Dropar a view existente que expõe emails
DROP VIEW IF EXISTS public.revenue_shares_with_correct_photographer;

-- Recriar a view SEM expor o email do fotógrafo
CREATE VIEW public.revenue_shares_with_correct_photographer AS
SELECT 
  rs.id,
  rs.purchase_id,
  rs.photographer_amount,
  rs.platform_amount,
  rs.organization_amount,
  p.photographer_id AS correct_photographer_id,
  p.status AS purchase_status,
  p.created_at AS purchase_created_at,
  p.photo_id,
  prof.full_name AS photographer_name
  -- REMOVIDO: prof.email AS photographer_email (exposição de dados)
FROM revenue_shares rs
JOIN purchases p ON rs.purchase_id = p.id
JOIN profiles prof ON p.photographer_id = prof.id;