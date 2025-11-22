-- Adicionar coluna is_banned para permitir banimento de usuários
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;

-- Criar índice para melhorar performance de queries que verificam banimento
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON profiles(is_banned) WHERE is_banned = true;

-- Adicionar constraint para garantir que apenas admins podem desbanir através de triggers
CREATE OR REPLACE FUNCTION prevent_self_unban()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Permitir se for admin
  IF has_role(auth.uid(), 'admin'::user_role) THEN
    RETURN NEW;
  END IF;
  
  -- Impedir que usuário banido altere seu próprio status
  IF OLD.is_banned = true AND NEW.is_banned = false AND auth.uid() = NEW.id THEN
    RAISE EXCEPTION 'Usuários banidos não podem alterar seu próprio status';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_unban_permission
  BEFORE UPDATE OF is_banned ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_self_unban();

-- Tornar campos PIX opcionais (serão preenchidos no momento da solicitação)
ALTER TABLE payout_requests 
  ALTER COLUMN pix_key DROP NOT NULL,
  ALTER COLUMN recipient_name DROP NOT NULL,
  ALTER COLUMN institution DROP NOT NULL;

-- Adicionar validação para garantir que campos PIX estão preenchidos quando status é pending
CREATE OR REPLACE FUNCTION validate_payout_pix_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pending' AND (
    NEW.pix_key IS NULL OR 
    trim(NEW.pix_key) = '' OR
    NEW.recipient_name IS NULL OR 
    trim(NEW.recipient_name) = ''
  ) THEN
    RAISE EXCEPTION 'PIX key e nome do beneficiário são obrigatórios para solicitar repasse';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_payout_pix_before_insert
  BEFORE INSERT ON payout_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_payout_pix_data();

CREATE TRIGGER validate_payout_pix_before_update
  BEFORE UPDATE ON payout_requests
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION validate_payout_pix_data();

-- Criar função para definir primeira foto como capa do evento automaticamente
CREATE OR REPLACE FUNCTION set_first_photo_as_cover()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cover_url TEXT;
BEGIN
  -- Buscar cover_image_url atual da campanha
  SELECT cover_image_url INTO v_cover_url
  FROM campaigns
  WHERE id = NEW.campaign_id;
  
  -- Se a campanha não tem capa ainda, definir esta foto como capa
  IF v_cover_url IS NULL OR v_cover_url = '' THEN
    UPDATE campaigns
    SET cover_image_url = NEW.watermarked_url
    WHERE id = NEW.campaign_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_set_campaign_cover
  AFTER INSERT ON photos
  FOR EACH ROW
  EXECUTE FUNCTION set_first_photo_as_cover();