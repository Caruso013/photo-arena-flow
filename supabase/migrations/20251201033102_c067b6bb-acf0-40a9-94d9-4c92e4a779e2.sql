-- Remover a restrição de única solicitação pending
-- Permitir múltiplas solicitações desde que haja saldo disponível
DROP INDEX IF EXISTS unique_pending_payout_per_photographer;

-- Comentário: A validação de saldo disponível é feita no frontend
-- O fotógrafo pode criar múltiplas solicitações desde que tenha saldo > 0
COMMENT ON TABLE public.payout_requests 
IS 'Solicitações de repasse de fotógrafos. Múltiplas solicitações são permitidas desde que haja saldo disponível. O saldo é calculado no frontend descontando valores de solicitações pending, approved e completed.';