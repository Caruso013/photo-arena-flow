-- Corrigir erro de format() no trigger de notificações de payout
-- O problema: format('texto %.2f %s', valor, texto_com_pontos) interpreta pontos no texto como especificadores
-- Solução: Escapar o texto do notes antes de passar para format()

CREATE OR REPLACE FUNCTION public.notify_payout_status_change()
RETURNS TRIGGER AS $$
DECLARE
  photographer_email TEXT;
  notification_title TEXT;
  notification_message TEXT;
  safe_notes TEXT;
BEGIN
  -- Buscar email do fotógrafo
  SELECT email INTO photographer_email
  FROM auth.users
  WHERE id = NEW.photographer_id;

  -- Escapar caracteres especiais no notes para evitar erro de format()
  -- Substituir % por %% para que format() não tente interpretar como especificador
  safe_notes := REPLACE(COALESCE(NEW.notes, ''), '%', '%%');

  -- Definir título e mensagem baseado no status
  IF NEW.status = 'approved' THEN
    notification_title := 'Repasse Aprovado! 🎉';
    -- Usar concatenação ao invés de format() para evitar problemas com caracteres especiais
    notification_message := 'Seu repasse de R$ ' || 
                           TO_CHAR(NEW.amount, 'FM999G999G990D00') || 
                           ' foi aprovado e será processado em breve.';
    IF safe_notes != '' THEN
      notification_message := notification_message || ' Observação: ' || safe_notes;
    END IF;
  ELSIF NEW.status = 'rejected' THEN
    notification_title := 'Repasse Recusado';
    -- Usar concatenação ao invés de format() para evitar problemas com caracteres especiais
    notification_message := 'Seu repasse de R$ ' || 
                           TO_CHAR(NEW.amount, 'FM999G999G990D00') || 
                           ' foi recusado.';
    IF safe_notes != '' THEN
      notification_message := notification_message || ' Motivo: ' || safe_notes;
    ELSE
      notification_message := notification_message || ' Entre em contato para mais informações.';
    END IF;
  ELSIF NEW.status = 'completed' THEN
    notification_title := 'Repasse Concluído! ✅';
    notification_message := 'Seu repasse de R$ ' || 
                           TO_CHAR(NEW.amount, 'FM999G999G990D00') || 
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

-- Recriar o trigger (caso já exista)
DROP TRIGGER IF EXISTS on_payout_status_change ON public.payout_requests;

CREATE TRIGGER on_payout_status_change
  AFTER UPDATE OF status
  ON public.payout_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.notify_payout_status_change();

-- Comentário explicativo
COMMENT ON FUNCTION public.notify_payout_status_change() IS 
'Trigger function que envia notificações quando status de payout muda. 
Corrigido para usar concatenação de strings ao invés de format() para evitar 
erro 22023 (unrecognized format type specifier) quando notes contém caracteres especiais.';
