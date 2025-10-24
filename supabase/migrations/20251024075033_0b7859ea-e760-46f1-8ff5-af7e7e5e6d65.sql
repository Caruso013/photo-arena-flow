-- PASSO 1: Identificar e remover duplicatas de payout_requests
-- Manter apenas a solicitação mais recente por fotógrafo quando houver duplicatas com status 'pending' ou 'approved'

WITH duplicates AS (
  SELECT 
    photographer_id,
    status,
    COUNT(*) as count,
    ARRAY_AGG(id ORDER BY requested_at DESC) as ids
  FROM payout_requests
  WHERE status IN ('pending', 'approved')
  GROUP BY photographer_id, status
  HAVING COUNT(*) > 1
),
ids_to_keep AS (
  SELECT ids[1] as id_to_keep
  FROM duplicates
),
ids_to_delete AS (
  SELECT UNNEST(ids[2:]) as id_to_delete
  FROM duplicates
)
DELETE FROM payout_requests
WHERE id IN (SELECT id_to_delete FROM ids_to_delete);

-- PASSO 2: Criar constraint único para impedir duplicatas futuras
CREATE UNIQUE INDEX unique_pending_approved_payout_per_photographer 
ON payout_requests(photographer_id) 
WHERE (status IN ('pending', 'approved'));

-- PASSO 3: Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_payout_requests_photographer_status 
ON payout_requests(photographer_id, status) 
WHERE status IN ('pending', 'approved', 'rejected');

-- Comentário explicativo
COMMENT ON INDEX unique_pending_approved_payout_per_photographer 
IS 'Impede que fotógrafos criem múltiplas solicitações de repasse simultâneas. Apenas 1 solicitação pendente ou aprovada é permitida por vez.';