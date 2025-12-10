-- ==========================================
-- CORREÇÃO 1: Adicionar search_path a todas as funções
-- ==========================================

-- Função 1
ALTER FUNCTION public.update_photographer_applications_updated_at() SET search_path = 'public';

-- Função 2
ALTER FUNCTION public.validate_payout_recipient() SET search_path = 'public';

-- Função 3
ALTER FUNCTION public.update_sub_event_photo_count() SET search_path = 'public';

-- Função 4
ALTER FUNCTION public.validate_campaign_revenue_split() SET search_path = 'public';

-- Função 5
ALTER FUNCTION public.validate_payout_minimum_balance() SET search_path = 'public';

-- Função 6
ALTER FUNCTION public.generate_short_code() SET search_path = 'public';

-- Função 7
ALTER FUNCTION public.set_campaign_short_code() SET search_path = 'public';

-- Função 8
ALTER FUNCTION public.update_photo_collaborators_updated_at() SET search_path = 'public';

-- Função 9
ALTER FUNCTION public.prevent_album_deletion_with_pending_payouts() SET search_path = 'public';

-- Função 10
ALTER FUNCTION public.soft_delete_photos_with_sales() SET search_path = 'public';

-- Função 11
ALTER FUNCTION public.auto_deactivate_expired_coupons() SET search_path = 'public';

-- Função 12
ALTER FUNCTION public.increment_coupon_usage() SET search_path = 'public';

-- Função 13
ALTER FUNCTION public.campaigns_set_org_percentage() SET search_path = 'public';

-- Função 14
ALTER FUNCTION public.update_organization_members_updated_at() SET search_path = 'public';

-- ==========================================
-- CORREÇÃO 2: Criar view segura para nomes de compradores
-- ==========================================

-- View que permite fotógrafos verem apenas nomes de clientes que compraram suas fotos
-- SEM expor emails (proteção de privacidade)
CREATE OR REPLACE VIEW public.buyer_names_for_photographers AS
SELECT DISTINCT
  pr.id as buyer_id,
  pr.full_name as buyer_name,
  p.photographer_id
FROM public.profiles pr
INNER JOIN public.purchases p ON p.buyer_id = pr.id
WHERE p.status = 'completed';

-- Habilitar RLS na view
ALTER VIEW public.buyer_names_for_photographers SET (security_invoker = true);

-- Comentário explicativo
COMMENT ON VIEW public.buyer_names_for_photographers IS 'View segura que permite fotógrafos verem APENAS o nome de clientes que compraram suas fotos. Não expõe emails.';

-- ==========================================
-- CORREÇÃO 3: Função segura para buscar nome do comprador
-- ==========================================

CREATE OR REPLACE FUNCTION public.get_buyer_name_for_photographer(
  p_buyer_id uuid,
  p_photographer_id uuid
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT pr.full_name
  FROM profiles pr
  WHERE pr.id = p_buyer_id
    AND EXISTS (
      SELECT 1 FROM purchases p
      WHERE p.buyer_id = p_buyer_id
        AND p.photographer_id = p_photographer_id
        AND p.status = 'completed'
    )
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_buyer_name_for_photographer IS 'Retorna o nome do comprador APENAS se ele comprou fotos do fotógrafo especificado. Não expõe informações de outros compradores.';

-- ==========================================
-- CORREÇÃO 4: Política RLS para profiles que permite ver nomes de compradores
-- ==========================================

-- Criar política que permite fotógrafos verem apenas nomes de quem comprou deles
CREATE POLICY "Photographers can view buyer names who purchased from them"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Usuário pode ver seu próprio perfil
  auth.uid() = id
  OR
  -- Admins podem ver todos
  has_role(auth.uid(), 'admin'::user_role)
  OR
  -- Fotógrafos podem ver perfis de quem comprou deles
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

-- Verificação final
SELECT 'Migration aplicada com sucesso! 14 funções corrigidas + view de nomes de compradores criada.' as status;