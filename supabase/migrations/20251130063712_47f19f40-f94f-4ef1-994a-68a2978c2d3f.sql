-- Atualizar trigger de notificação para incluir status 'completed'
-- completed = pagamento efetivado

CREATE OR REPLACE FUNCTION public.notify_payout_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_photographer_name TEXT;
BEGIN
  -- Apenas notificar quando status mudar
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected', 'completed') THEN
    
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
        WHEN NEW.status = 'completed' THEN 'payout_completed'
        ELSE 'payout_rejected'
      END,
      CASE 
        WHEN NEW.status = 'approved' THEN 'Repasse Aprovado! ✅'
        WHEN NEW.status = 'completed' THEN 'Repasse Pago! 💰'
        ELSE 'Repasse Recusado'
      END,
      CASE 
        WHEN NEW.status = 'approved' 
        THEN format('Seu repasse de R$ %.2f foi aprovado e será pago em breve.', NEW.amount)
        WHEN NEW.status = 'completed'
        THEN format('Seu repasse de R$ %.2f foi efetivado! O valor já foi transferido.', NEW.amount)
        ELSE format('Seu repasse de R$ %.2f foi recusado. %s', 
          NEW.amount,
          COALESCE('Motivo: ' || NEW.notes, 'Entre em contato para mais informações.')
        )
      END,
      '/dashboard/photographer/payout-request',
      jsonb_build_object(
        'payout_request_id', NEW.id,
        'amount', NEW.amount,
        'status', NEW.status,
        'processed_at', COALESCE(NEW.completed_at, NEW.processed_at)
      )
    );
    
    -- Log para debug
    RAISE NOTICE 'Notificação de repasse % criada para fotógrafo %', NEW.status, v_photographer_name;
  END IF;
  
  RETURN NEW;
END;
$function$;