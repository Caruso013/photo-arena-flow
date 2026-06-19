-- Adicionar trigger para notificar fotógrafo sobre mudanças em payout_requests
-- Sobrescrever função existente se houver
CREATE OR REPLACE FUNCTION public.notify_payout_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_photographer_name TEXT;
BEGIN
  -- Apenas notificar quando status mudar
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    
    -- Buscar nome do fotógrafo
    SELECT full_name INTO v_photographer_name
    FROM profiles
    WHERE id = NEW.photographer_id;
    
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
      CASE 
        WHEN NEW.status = 'approved' 
        THEN format('Seu repasse de R$ %.2f foi aprovado e será processado em até 2 dias úteis.', NEW.amount)
        ELSE format('Seu repasse de R$ %.2f foi recusado. %s', 
          NEW.amount,
          COALESCE('Motivo: ' || NEW.notes, 'Entre em contato para mais informações.')
        )
      END,
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

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS trigger_notify_payout_status ON public.payout_requests;

-- Criar novo trigger
CREATE TRIGGER trigger_notify_payout_status
  AFTER UPDATE ON public.payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_payout_status();;
