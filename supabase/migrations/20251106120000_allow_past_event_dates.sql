-- Permitir criação de eventos com datas no passado
-- Útil para eventos já fotografados que precisam ser registrados no sistema

-- Remover a função antiga que bloqueia datas no passado
DROP FUNCTION IF EXISTS prevent_past_event_date() CASCADE;

-- Recriar a função validate_campaign_date sem validação de data passada
CREATE OR REPLACE FUNCTION validate_campaign_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas log, sem bloquear
  -- A validação de data passada foi removida para permitir registro de eventos retroativos
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remover trigger antigo se existir
DROP TRIGGER IF EXISTS trg_validate_event_date ON public.campaigns;

-- Não criar novo trigger pois não há validação necessária
-- Se no futuro precisar adicionar validações, pode recriar aqui

COMMENT ON FUNCTION validate_campaign_date IS 'Função placeholder para validação de datas de campanhas. Atualmente permite datas no passado para eventos retroativos.';
