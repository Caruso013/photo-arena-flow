-- ============================================================================
-- FIX: Notificação de status 'completed' causando erro notifications_type_check
-- ============================================================================
-- Problema: notify_payout_status_change() tenta inserir tipo 'payout' quando
-- status é 'completed', mas esse tipo não está no check constraint.
-- Solução: Modificar função para usar 'payout_completed' e não criar notificação
-- para status 'completed' (apenas para approved/rejected).
-- ============================================================================

-- Recriar função notify_payout_status_change() para NÃO notificar em 'completed'
CREATE OR REPLACE FUNCTION public.notify_payout_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  photographer_email TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Apenas processar se o status mudou e é relevante para notificação
  -- NÃO criar notificação para 'completed' (pagamento já foi notificado na aprovação)
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    
    -- Buscar email do fotógrafo
    SELECT email INTO photographer_email
    FROM auth.users
    WHERE id = NEW.photographer_id;

    -- Definir título e mensagem baseado no status
    IF NEW.status = 'approved' THEN
      notification_title := 'Repasse Aprovado! 💰';
      -- Usar concatenação em vez de format() para evitar erro 22023
      notification_message := 'Seu repasse de R$ ' || ROUND(NEW.amount::numeric, 2)::text || 
                             ' foi aprovado e será processado em até 2 dias úteis.';
    ELSIF NEW.status = 'rejected' THEN
      notification_title := 'Repasse Recusado';
      notification_message := 'Seu repasse de R$ ' || ROUND(NEW.amount::numeric, 2)::text || ' foi recusado.';
      IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
        notification_message := notification_message || ' Motivo: ' || NEW.notes;
      ELSE
        notification_message := notification_message || ' Entre em contato para mais informações.';
      END IF;
    END IF;

    -- Inserir notificação com tipo correto baseado no status
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      created_at
    ) VALUES (
      NEW.photographer_id,
      CASE 
        WHEN NEW.status = 'approved' THEN 'payout_approved'
        WHEN NEW.status = 'rejected' THEN 'payout_rejected'
        ELSE 'payout_approved' -- Fallback (não deve acontecer)
      END,
      notification_title,
      notification_message,
      NOW()
    );

    -- Enviar email se disponível
    IF photographer_email IS NOT NULL THEN
      -- TODO: Integrar com sistema de email (Resend)
      NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário explicativo
COMMENT ON FUNCTION public.notify_payout_status_change() IS 
'Trigger function que cria notificações quando payout_requests muda para approved/rejected.
NÃO cria notificação para completed pois o fotógrafo já foi notificado na aprovação.
Usa concatenação de strings em vez de format() para evitar erro 22023.
Corrigido em 2025-12-02 para resolver erro notifications_type_check.';
