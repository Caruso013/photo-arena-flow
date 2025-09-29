-- FASE 3: ADICIONAR VALIDAÇÃO DE DADOS E CONSTRAINTS

-- 1. Adicionar validação de valores monetários (não podem ser negativos)
ALTER TABLE public.photos
ADD CONSTRAINT check_price_positive CHECK (price >= 0);

ALTER TABLE public.purchases
ADD CONSTRAINT check_amount_positive CHECK (amount >= 0);

ALTER TABLE public.payout_requests
ADD CONSTRAINT check_payout_amount_positive CHECK (amount >= 0);

ALTER TABLE public.revenue_shares
ADD CONSTRAINT check_revenue_amounts_positive 
CHECK (
  photographer_amount >= 0 AND 
  organization_amount >= 0 AND 
  platform_amount >= 0
);

-- 2. Adicionar validação de porcentagens (0-100)
ALTER TABLE public.organizations
ADD CONSTRAINT check_admin_percentage_valid 
CHECK (admin_percentage >= 0 AND admin_percentage <= 100);

ALTER TABLE public.organization_members
ADD CONSTRAINT check_photographer_percentage_valid 
CHECK (photographer_percentage >= 0 AND photographer_percentage <= 100);

-- 3. Validar datas de eventos (não podem ser no passado ao criar)
CREATE OR REPLACE FUNCTION public.validate_campaign_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Permitir atualização de campanhas existentes
  IF TG_OP = 'UPDATE' THEN
    RETURN NEW;
  END IF;
  
  -- Para novas campanhas, validar data
  IF NEW.event_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Data do evento não pode ser no passado';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_campaign_date_trigger
BEFORE INSERT ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.validate_campaign_date();

-- 4. Validar status de purchases
ALTER TABLE public.purchases
ADD CONSTRAINT check_purchase_status 
CHECK (status IN ('pending', 'completed', 'failed', 'refunded'));

-- 5. Validar status de payout_requests
ALTER TABLE public.payout_requests
ADD CONSTRAINT check_payout_status 
CHECK (status IN ('pending', 'approved', 'rejected', 'paid'));

-- 6. Validar status de event_applications
ALTER TABLE public.event_applications
ADD CONSTRAINT check_application_status 
CHECK (status IN ('pending', 'approved', 'rejected'));

-- 7. Adicionar comentários de documentação
COMMENT ON CONSTRAINT check_price_positive ON public.photos IS 
'Garante que o preço da foto não seja negativo';

COMMENT ON CONSTRAINT check_revenue_amounts_positive ON public.revenue_shares IS 
'Garante que todos os valores de divisão de receita sejam não-negativos';

COMMENT ON FUNCTION public.validate_campaign_date IS 
'Valida que a data do evento não esteja no passado para novas campanhas';