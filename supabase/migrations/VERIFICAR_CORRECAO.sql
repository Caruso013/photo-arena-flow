-- QUERY DE VERIFICAÇÃO PÓS-MIGRAÇÃO
-- Execute essa query para verificar se a correção funcionou

-- 1) Ver quantos revenue_shares existem
SELECT 
  'Total de revenue_shares' as info,
  COUNT(*) as quantidade
FROM revenue_shares;

-- 2) Ver quantos têm photographer_id correto
SELECT 
  'Revenue shares com ID correto' as info,
  COUNT(*) as quantidade
FROM revenue_shares rs
INNER JOIN purchases p ON rs.purchase_id = p.id
WHERE rs.photographer_id = p.photographer_id;

-- 3) Ver detalhes do usuário kauan.castao1@gmail.com
SELECT 
  'Revenue shares do kauan.castao1@gmail.com' as info,
  rs.id,
  rs.photographer_id,
  rs.photographer_amount,
  p.photographer_id as purchase_photographer_id,
  p.created_at,
  p.status,
  prof.email
FROM revenue_shares rs
INNER JOIN purchases p ON rs.purchase_id = p.id
INNER JOIN profiles prof ON rs.photographer_id = prof.id
WHERE prof.email = 'kauan.castao1@gmail.com';

-- 4) Verificar se trigger existe
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname = 'trigger_sync_photographer_id';

-- 5) Verificar se constraint existe
SELECT 
  conname as constraint_name,
  conrelid::regclass as table_name
FROM pg_constraint 
WHERE conname = 'fk_revenue_shares_photographer';

-- 6) Ver todos os foreign keys de revenue_shares
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'revenue_shares';
