-- Corrigir erro format() ao aprovar repasse
-- Problema: Existem DUAS funções com format() causando erro
-- Solução: Sobrescrever AMBAS as funções usando apenas concatenação de strings

-- Função 1: notify_payout_status() (usada por trigger_notify_payout_status)
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
    
    -- Criar notificação usando APENAS concatenação de strings
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
        WHEN NEW.status = 'approved' THEN 
          'Seu repasse de R$ ' || ROUND(NEW.amount::numeric, 2)::text || ' foi aprovado e será processado em até 2 dias úteis.'
        ELSE 
          'Seu repasse de R$ ' || ROUND(NEW.amount::numeric, 2)::text || ' foi recusado. ' ||
          COALESCE('Motivo: ' || NEW.notes, 'Entre em contato para mais informações.')
      END,
      '/dashboard/financial',
      jsonb_build_object(
        'payout_request_id', NEW.id,
        'amount', NEW.amount,
        'status', NEW.status,
        'processed_at', NEW.processed_at
      )
    );
    
    RAISE NOTICE 'Notificação de repasse % criada para fotógrafo %', NEW.status, v_photographer_name;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.notify_payout_status() IS 
'Trigger que cria notificações ao atualizar status de payout_requests.
IMPORTANTE: Usar apenas concatenação de strings simples com ROUND().
NUNCA usar format() ou TO_CHAR() pois causam erro com caracteres especiais.';

-- Função 2: notify_payout_status_change() (usada por on_payout_status_change)
CREATE OR REPLACE FUNCTION public.notify_payout_status_change()
RETURNS TRIGGER AS $$
DECLARE
  photographer_email TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Buscar email do fotógrafo
  SELECT email INTO photographer_email
  FROM auth.users
  WHERE id = NEW.photographer_id;

  -- Definir título e mensagem baseado no status
  IF NEW.status = 'approved' THEN
    notification_title := 'Repasse Aprovado! 🎉';
    -- Usar concatenação simples com ROUND() para evitar problemas
    notification_message := 'Seu repasse de R$ ' || 
                           ROUND(NEW.amount::numeric, 2)::text || 
                           ' foi aprovado e será processado em breve.';
    IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
      notification_message := notification_message || ' Observação: ' || NEW.notes;
    END IF;
  ELSIF NEW.status = 'rejected' THEN
    notification_title := 'Repasse Recusado';
    notification_message := 'Seu repasse de R$ ' || 
                           ROUND(NEW.amount::numeric, 2)::text || 
                           ' foi recusado.';
    IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
      notification_message := notification_message || ' Motivo: ' || NEW.notes;
    ELSE
      notification_message := notification_message || ' Entre em contato para mais informações.';
    END IF;
  ELSIF NEW.status = 'completed' THEN
    notification_title := 'Repasse Concluído! ✅';
    notification_message := 'Seu repasse de R$ ' || 
                           ROUND(NEW.amount::numeric, 2)::text || 
                           ' foi concluído com sucesso!';
  ELSE
    RETURN NEW; -- Não notificar para outros status
  END IF;

  -- Inserir notificação com tipo correto baseado no status
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    created_at
  ) VALUES (
    NEW.photographer_id,
    notification_title,
    notification_message,
    CASE 
      WHEN NEW.status = 'approved' THEN 'payout_approved'
      WHEN NEW.status = 'rejected' THEN 'payout_rejected'
      WHEN NEW.status = 'completed' THEN 'payout_completed'
      ELSE 'payout_status_change'
    END,
    NOW()
  );

  -- Enviar email se disponível
  IF photographer_email IS NOT NULL THEN
    -- TODO: Integrar com sistema de email (Resend)
    NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.notify_payout_status_change() IS 
'Trigger que cria notificações ao atualizar status de payout_requests.
IMPORTANTE: Usar apenas concatenação de strings simples com ROUND().
NUNCA usar format() ou TO_CHAR() pois causam erro com caracteres especiais.';

-- Resumo da correção:
-- Esta migration sobrescreve DUAS funções que estavam causando erro:
-- 1. notify_payout_status() - usada pelo trigger trigger_notify_payout_status
-- 2. notify_payout_status_change() - usada pelo trigger on_payout_status_change
-- Ambas agora usam concatenação simples em vez de format() para evitar erro 22023
