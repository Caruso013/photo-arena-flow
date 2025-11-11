-- Sprint 2: Sistema de Notificações
-- Criar tabela e triggers para notificações em tempo real

-- Tabela de notificações
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('sale', 'purchase', 'payout_approved', 'payout_rejected', 'application_approved', 'application_rejected', 'new_campaign', 'photo_approved')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

-- Índices para performance
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC) WHERE is_read = false;
CREATE INDEX idx_notifications_user_all ON notifications(user_id, created_at DESC);

-- RLS Policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Função para marcar notificações como lidas
CREATE OR REPLACE FUNCTION mark_notification_as_read()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.is_read = true AND OLD.is_read = false THEN
    NEW.read_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_mark_notification_read
BEFORE UPDATE ON notifications
FOR EACH ROW
WHEN (NEW.is_read = true AND OLD.is_read = false)
EXECUTE FUNCTION mark_notification_as_read();

-- Função para criar notificação de venda para fotógrafo
CREATE OR REPLACE FUNCTION notify_photographer_on_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_photo_title TEXT;
  v_buyer_name TEXT;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Buscar informações da foto
    SELECT title INTO v_photo_title FROM photos WHERE id = NEW.photo_id;
    SELECT full_name INTO v_buyer_name FROM profiles WHERE id = NEW.buyer_id;
    
    -- Criar notificação para o fotógrafo
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      metadata
    ) VALUES (
      NEW.photographer_id,
      'sale',
      'Nova Venda! 🎉',
      format('Você vendeu uma foto para %s por R$ %s', 
        COALESCE(v_buyer_name, 'um cliente'), 
        to_char(NEW.amount, 'FM999,999.00')
      ),
      '/dashboard/financial',
      jsonb_build_object(
        'purchase_id', NEW.id,
        'amount', NEW.amount,
        'photo_title', v_photo_title
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_photographer_sale
AFTER INSERT OR UPDATE ON purchases
FOR EACH ROW
EXECUTE FUNCTION notify_photographer_on_sale();

-- Função para criar notificação de compra confirmada para comprador
CREATE OR REPLACE FUNCTION notify_buyer_on_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_photo_title TEXT;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Buscar título da foto
    SELECT title INTO v_photo_title FROM photos WHERE id = NEW.photo_id;
    
    -- Criar notificação para o comprador
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      metadata
    ) VALUES (
      NEW.buyer_id,
      'purchase',
      'Compra Confirmada! ✓',
      format('Sua compra de R$ %s foi confirmada. A foto já está disponível!', 
        to_char(NEW.amount, 'FM999,999.00')
      ),
      '/dashboard/my-purchases',
      jsonb_build_object(
        'purchase_id', NEW.id,
        'photo_id', NEW.photo_id,
        'photo_title', v_photo_title
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_buyer_purchase
AFTER INSERT OR UPDATE ON purchases
FOR EACH ROW
EXECUTE FUNCTION notify_buyer_on_purchase();

-- Função para notificar aprovação/rejeição de repasse
CREATE OR REPLACE FUNCTION notify_payout_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
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
        THEN format('Seu repasse de R$ %s foi aprovado e será processado em breve.', 
          to_char(NEW.amount, 'FM999,999.00'))
        ELSE format('Seu repasse de R$ %s foi recusado. %s', 
          to_char(NEW.amount, 'FM999,999.00'),
          COALESCE('Motivo: ' || NEW.notes, 'Entre em contato para mais informações.')
        )
      END,
      '/dashboard/financial',
      jsonb_build_object(
        'payout_request_id', NEW.id,
        'amount', NEW.amount,
        'status', NEW.status
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_payout_status
AFTER UPDATE ON payout_requests
FOR EACH ROW
WHEN (NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('approved', 'rejected'))
EXECUTE FUNCTION notify_payout_status();

COMMENT ON TABLE notifications IS 'Notificações em tempo real para usuários do sistema';
COMMENT ON FUNCTION notify_photographer_on_sale IS 'Notifica fotógrafo quando uma venda é completada';
COMMENT ON FUNCTION notify_buyer_on_purchase IS 'Notifica comprador quando uma compra é confirmada';