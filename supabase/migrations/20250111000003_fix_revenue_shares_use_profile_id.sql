-- Correção: Usar profile.id ao invés de photographer_id separado
-- Problema: revenue_shares.photographer_id não corresponde ao profiles.id do usuário
-- Solução: Remover photographer_id e usar purchase.photographer_id que já aponta pro profile correto

-- 1) Verificar estrutura atual
-- Revenue shares tem photographer_id que está desconectado do profile real
-- Purchases tem photographer_id que aponta corretamente pro profile

-- 2) Criar VIEW temporária para ver o relacionamento correto
CREATE OR REPLACE VIEW revenue_shares_with_correct_photographer AS
SELECT 
  rs.id,
  rs.purchase_id,
  rs.photographer_amount,
  rs.platform_amount,
  rs.organization_amount,
  p.photographer_id as correct_photographer_id,  -- ID correto do profile
  p.status as purchase_status,
  p.created_at as purchase_created_at,
  p.photo_id,
  prof.email as photographer_email,
  prof.full_name as photographer_name
FROM revenue_shares rs
INNER JOIN purchases p ON rs.purchase_id = p.id
INNER JOIN profiles prof ON p.photographer_id = prof.id;

COMMENT ON VIEW revenue_shares_with_correct_photographer IS 
'View que mostra revenue_shares com o photographer_id CORRETO vindos de purchases';

-- 3) Atualizar revenue_shares com o photographer_id correto de purchases
UPDATE revenue_shares rs
SET photographer_id = p.photographer_id
FROM purchases p
WHERE rs.purchase_id = p.id
  AND (rs.photographer_id IS NULL OR rs.photographer_id != p.photographer_id);

-- 4) Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_revenue_shares_photographer_id 
ON revenue_shares(photographer_id);

-- 5) Adicionar constraint para garantir que photographer_id sempre venha de purchases
-- Remover constraint antigo se existir
ALTER TABLE revenue_shares DROP CONSTRAINT IF EXISTS fk_revenue_shares_photographer;

-- Adicionar nova constraint
ALTER TABLE revenue_shares
ADD CONSTRAINT fk_revenue_shares_photographer
FOREIGN KEY (photographer_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- 6) Criar trigger para auto-preencher photographer_id de purchases
CREATE OR REPLACE FUNCTION sync_photographer_id_from_purchase()
RETURNS TRIGGER AS $$
DECLARE
  correct_photographer_id UUID;
BEGIN
  -- Buscar photographer_id da purchase
  SELECT photographer_id INTO correct_photographer_id
  FROM purchases
  WHERE id = NEW.purchase_id;
  
  IF correct_photographer_id IS NULL THEN
    RAISE EXCEPTION 'Purchase % não tem photographer_id definido', NEW.purchase_id;
  END IF;
  
  -- Sempre sobrescrever com o ID correto da purchase
  NEW.photographer_id := correct_photographer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS trigger_sync_photographer_id ON revenue_shares;

-- Criar trigger que roda ANTES de insert/update
-- Remove a condição WHEN para sempre executar e garantir ID correto
CREATE TRIGGER trigger_sync_photographer_id
  BEFORE INSERT OR UPDATE ON revenue_shares
  FOR EACH ROW
  EXECUTE FUNCTION sync_photographer_id_from_purchase();

-- 7) Verificar dados corrigidos
DO $$
DECLARE
  total_rs INTEGER;
  total_corrected INTEGER;
  total_null INTEGER;
BEGIN
  -- Contar total de revenue_shares
  SELECT COUNT(*) INTO total_rs FROM revenue_shares;
  
  -- Contar quantos têm photographer_id correto (igual ao da purchase)
  SELECT COUNT(*) INTO total_corrected
  FROM revenue_shares rs
  INNER JOIN purchases p ON rs.purchase_id = p.id
  WHERE rs.photographer_id = p.photographer_id;
  
  -- Contar quantos ainda estão NULL
  SELECT COUNT(*) INTO total_null
  FROM revenue_shares
  WHERE photographer_id IS NULL;
  
  RAISE NOTICE '═══════════════════════════════════════';
  RAISE NOTICE 'RESULTADO DA CORREÇÃO:';
  RAISE NOTICE 'Total de revenue_shares: %', total_rs;
  RAISE NOTICE 'Com photographer_id correto: %', total_corrected;
  RAISE NOTICE 'Com photographer_id NULL: %', total_null;
  RAISE NOTICE '═══════════════════════════════════════';
  
  IF total_null > 0 THEN
    RAISE WARNING 'Ainda existem % revenue_shares com photographer_id NULL!', total_null;
  END IF;
  
  IF total_corrected = total_rs THEN
    RAISE NOTICE '✅ Todos os photographer_id foram corrigidos!';
  END IF;
END $$;

-- 8) Query de verificação para o problema específico do usuário
-- Verificar revenue_shares do fotógrafo kauan.castao1@gmail.com
DO $$
DECLARE
  user_profile_id UUID;
  rs_count INTEGER;
  rs_record RECORD;
BEGIN
  -- Buscar profile ID do usuário
  SELECT id INTO user_profile_id
  FROM profiles
  WHERE email = 'kauan.castao1@gmail.com';
  
  IF user_profile_id IS NULL THEN
    RAISE NOTICE '⚠️ Usuário kauan.castao1@gmail.com não encontrado';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Profile ID do usuário: %', user_profile_id;
  
  -- Contar revenue_shares desse fotógrafo
  SELECT COUNT(*) INTO rs_count
  FROM revenue_shares
  WHERE photographer_id = user_profile_id;
  
  RAISE NOTICE 'Revenue shares encontrados: %', rs_count;
  
  -- Mostrar detalhes
  IF rs_count > 0 THEN
    RAISE NOTICE 'Detalhes das revenue shares:';
    FOR rs_record IN (
      SELECT 
        rs.id,
        rs.photographer_amount,
        p.created_at,
        p.status,
        EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 3600 as hours_ago
      FROM revenue_shares rs
      INNER JOIN purchases p ON rs.purchase_id = p.id
      WHERE rs.photographer_id = user_profile_id
      ORDER BY p.created_at DESC
    ) LOOP
      RAISE NOTICE '  - R$ %.2f | Status: % | Há %.1f horas | %', 
        rs_record.photographer_amount, 
        rs_record.status, 
        rs_record.hours_ago,
        CASE WHEN rs_record.hours_ago >= 12 THEN '✅ Disponível' ELSE '⏳ Aguardando' END;
    END LOOP;
  ELSE
    RAISE WARNING '❌ Nenhuma revenue share encontrada para este fotógrafo!';
    RAISE NOTICE 'Verificando purchases...';
    
    SELECT COUNT(*) INTO rs_count
    FROM purchases
    WHERE photographer_id = user_profile_id;
    
    IF rs_count > 0 THEN
      RAISE NOTICE '✅ Existem % purchases para este fotógrafo', rs_count;
      RAISE NOTICE '⚠️ MAS as revenue_shares não foram criadas ou estão com photographer_id errado!';
    ELSE
      RAISE NOTICE '❌ Nenhuma purchase encontrada também';
    END IF;
  END IF;
END $$;

-- 9) Comentários explicativos
COMMENT ON TRIGGER trigger_sync_photographer_id ON revenue_shares IS 
'Auto-preenche photographer_id de revenue_shares baseado no photographer_id de purchases';

COMMENT ON FUNCTION sync_photographer_id_from_purchase() IS 
'Busca photographer_id da tabela purchases e preenche automaticamente em revenue_shares';
