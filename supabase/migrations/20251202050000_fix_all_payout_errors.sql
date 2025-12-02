-- ============================================================================
-- FIX FINAL: Corrigir TODOS os erros de payout
-- ============================================================================
-- Problema 1: notify_payout_status() usa format() que causa erro 22023
-- Problema 2: check_payout_status não permite 'completed'
-- Solução: Reescrever função sem format() e adicionar 'completed' ao constraint
-- ============================================================================

-- 1. Adicionar 'completed' ao check constraint
ALTER TABLE public.payout_requests
DROP CONSTRAINT IF EXISTS check_payout_status;

ALTER TABLE public.payout_requests
ADD CONSTRAINT check_payout_status 
CHECK (status IN ('pending', 'approved', 'rejected', 'paid', 'completed'));

-- 2. Corrigir notify_payout_status() para NÃO usar format()
CREATE OR REPLACE FUNCTION public.notify_payout_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_photographer_name TEXT;
  v_message TEXT;
BEGIN
  -- Apenas notificar quando status mudar
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    
    -- Buscar nome do fotógrafo
    SELECT full_name INTO v_photographer_name
    FROM profiles
    WHERE id = NEW.photographer_id;
    
    -- Construir mensagem de forma segura (SEM format() para evitar erro 22023)
    IF NEW.status = 'approved' THEN
      -- Concatenação simples em vez de format()
      v_message := 'Seu repasse de R$ ' || ROUND(NEW.amount::numeric, 2)::text || ' foi aprovado e será processado em até 2 dias úteis.';
    ELSE
      -- Para rejeição, também usar concatenação
      v_message := 'Seu repasse de R$ ' || ROUND(NEW.amount::numeric, 2)::text || ' foi recusado.';
      IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
        v_message := v_message || ' Motivo: ' || NEW.notes;
      ELSE
        v_message := v_message || ' Entre em contato para mais informações.';
      END IF;
    END IF;
    
    -- Criar notificação
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      metadata
    ) VALUES (
      NEW.photographer_id,
      CASE 
        WHEN NEW.status = 'approved' THEN 'payout_approved'
        ELSE 'payout_rejected'
      END,
      CASE 
        WHEN NEW.status = 'approved' THEN 'Repasse Aprovado! 💰'
        ELSE 'Repasse Recusado'
      END,
      v_message,
      '/dashboard/financial',
      jsonb_build_object(
        'payout_request_id', NEW.id,
        'amount', NEW.amount,
        'status', NEW.status,
        'processed_at', NEW.processed_at
      )
    );
    
    -- Log para debug
    RAISE NOTICE 'Notificação de repasse % criada para fotógrafo %', NEW.status, v_photographer_name;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Comentário explicativo
COMMENT ON FUNCTION public.notify_payout_status() IS 
'Trigger function que cria notificações quando status de payout_requests muda.
IMPORTANTE: NÃO usar format() com campos numéricos decimais ou texto variável,
usar concatenação de strings com ROUND() para valores monetários.
Correção aplicada em 2025-12-02 para resolver erro 22023.';
