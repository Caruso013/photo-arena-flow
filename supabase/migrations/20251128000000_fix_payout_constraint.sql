-- Remove a constraint antiga que impede múltiplos approved
DROP INDEX IF EXISTS unique_pending_approved_payout_per_photographer;

-- Cria nova constraint permitindo apenas 1 pending por fotógrafo
-- Mas permite múltiplos approved/rejected/completed
CREATE UNIQUE INDEX unique_pending_payout_per_photographer 
ON payout_requests(photographer_id) 
WHERE (status = 'pending');

COMMENT ON INDEX unique_pending_payout_per_photographer 
IS 'Impede que fotógrafos criem múltiplas solicitações de repasse pendentes. Apenas 1 solicitação pendente é permitida por vez. Approved, rejected e completed podem ter múltiplos.';
