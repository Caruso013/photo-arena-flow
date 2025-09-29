-- Corrigir search_path da função validate_campaign_date
CREATE OR REPLACE FUNCTION public.validate_campaign_date()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
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
$$;