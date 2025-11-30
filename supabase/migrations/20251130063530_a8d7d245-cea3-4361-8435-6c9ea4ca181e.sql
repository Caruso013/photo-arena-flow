-- Adicionar status 'completed' aos payout_requests
-- completed = efetivamente pago ao fotógrafo
-- approved = aprovado, aguardando pagamento
-- pending = aguardando aprovação
-- rejected = rejeitado

-- Primeiro, remover constraint antiga de status se existir
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'payout_requests_status_check'
  ) THEN
    ALTER TABLE public.payout_requests DROP CONSTRAINT payout_requests_status_check;
  END IF;
END $$;

-- Adicionar nova constraint com status 'completed'
ALTER TABLE public.payout_requests
ADD CONSTRAINT payout_requests_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'completed'));

-- Adicionar coluna completed_at para registrar quando foi efetivamente pago
ALTER TABLE public.payout_requests
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Adicionar coluna completed_by para registrar quem marcou como pago
ALTER TABLE public.payout_requests
ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES auth.users(id);

-- Comentários para documentação
COMMENT ON COLUMN public.payout_requests.status IS 'Status do repasse: pending (aguardando aprovação), approved (aprovado, aguardando pagamento), completed (efetivamente pago), rejected (rejeitado)';
COMMENT ON COLUMN public.payout_requests.completed_at IS 'Data/hora em que o repasse foi efetivamente pago ao fotógrafo';
COMMENT ON COLUMN public.payout_requests.completed_by IS 'ID do admin que marcou o repasse como pago';