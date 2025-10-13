-- Adicionar foreign key que estava faltando: purchase_id -> purchases(id)
-- Isso resolve o erro: "Could not find a relationship between 'revenue_shares' and 'purchases'"

-- 1) Verificar se já existe alguma FK para purchase_id
DO $$
BEGIN
  -- Tentar remover se existir (pode não existir, por isso BEGIN/EXCEPTION)
  BEGIN
    ALTER TABLE revenue_shares DROP CONSTRAINT IF EXISTS revenue_shares_purchase_id_fkey;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Constraint revenue_shares_purchase_id_fkey não existia';
  END;
END $$;

-- 2) Criar a foreign key que estava faltando
ALTER TABLE revenue_shares
ADD CONSTRAINT revenue_shares_purchase_id_fkey
FOREIGN KEY (purchase_id)
REFERENCES purchases(id)
ON DELETE CASCADE;

-- 3) Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_revenue_shares_purchase_id
ON revenue_shares(purchase_id);

-- 4) Verificar se foi criado corretamente
DO $$
DECLARE
  fk_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints
  WHERE constraint_name = 'revenue_shares_purchase_id_fkey'
    AND table_name = 'revenue_shares';
  
  IF fk_count > 0 THEN
    RAISE NOTICE '✅ Foreign key revenue_shares_purchase_id_fkey criada com sucesso!';
  ELSE
    RAISE WARNING '❌ Foreign key não foi criada!';
  END IF;
END $$;

-- 5) Testar o relacionamento
SELECT 
  'Teste de relacionamento' as info,
  COUNT(*) as total_revenue_shares,
  COUNT(DISTINCT p.id) as total_purchases_relacionadas
FROM revenue_shares rs
INNER JOIN purchases p ON rs.purchase_id = p.id;

COMMENT ON CONSTRAINT revenue_shares_purchase_id_fkey ON revenue_shares IS 
'Foreign key que relaciona revenue_shares com purchases';
