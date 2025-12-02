-- Corrigir função notify_payout_status() que causa erro format() type specifier
-- Bug: format('%s', text) interpreta % dentro do text como especificadores
-- Solução: concatenar strings em vez de usar format() para evitar interpretação

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
    
    -- Construir mensagem de forma segura (sem usar format() para campos variáveis)
    IF NEW.status = 'approved' THEN
      -- Para aprovação, usar format apenas com amount (numérico seguro)
      v_message := format('Seu repasse de R$ %.2f foi aprovado e será processado em até 2 dias úteis.', NEW.amount);
    ELSE
      -- Para rejeição, concatenar strings em vez de usar format() para evitar interpretação de %
      v_message := 'Seu repasse de R$ ' || NEW.amount::TEXT || ' foi recusado.';
      IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
        v_message := v_message || ' Motivo: ' || NEW.notes;
      ELSE
        v_message := v_message || ' Entre em contato para mais informações.';
      END IF;
    END IF;
    
    -- Criar notificação
    BEGIN
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
          WHEN NEW.status = 'approved' THEN 'payout_approved'::text
          ELSE 'payout_rejected'::text
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
    EXCEPTION
      WHEN check_violation THEN
        RAISE WARNING 'Erro ao criar notificação: tipo inválido. Status: %, Tipo tentado: %', 
          NEW.status, 
          CASE WHEN NEW.status = 'approved' THEN 'payout_approved' ELSE 'payout_rejected' END;
        -- Não lançar erro para não bloquear o update do payout_request
      WHEN OTHERS THEN
        RAISE WARNING 'Erro inesperado ao criar notificação: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Comentário explicativo para futuras referências
COMMENT ON FUNCTION public.notify_payout_status() IS 
'Trigger function que cria notificações quando status de payout_requests muda.
IMPORTANTE: Não usar format() com campos de texto variáveis (como notes) pois 
caracteres especiais como % e . podem causar erro 22023 "unrecognized format() type specifier".
Usar concatenação de strings para campos de texto do usuário.';
