-- Permitir que usuários vinculados em organization_users vejam revenue_shares da sua organização
-- (hoje só organization_members tem acesso, então o dashboard da org pode ver 0 mesmo havendo vendas)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'revenue_shares'
      AND policyname = 'Organization users can view their revenue shares'
  ) THEN
    CREATE POLICY "Organization users can view their revenue shares"
    ON public.revenue_shares
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.organization_users ou
        WHERE ou.organization_id = revenue_shares.organization_id
          AND ou.user_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Opcional: index para acelerar a checagem do EXISTS (não muda dados)
CREATE INDEX IF NOT EXISTS idx_organization_users_org_user
ON public.organization_users (organization_id, user_id);
