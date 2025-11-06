-- Remover completamente a validação de data no passado
-- Permite criar eventos com qualquer data, incluindo datas passadas

-- Drop todos os triggers relacionados a validação de data
DROP TRIGGER IF EXISTS validate_campaign_date_trigger ON public.campaigns;
DROP TRIGGER IF EXISTS trg_validate_event_date ON public.campaigns;

-- Drop todas as funções de validação de data
DROP FUNCTION IF EXISTS public.validate_campaign_date() CASCADE;
DROP FUNCTION IF EXISTS public.prevent_past_event_date() CASCADE;

-- Adicionar comentário na tabela explicando a mudança
COMMENT ON TABLE public.campaigns IS 'Campanhas/eventos de fotografia. Permite criar eventos com datas no passado para registro de eventos retroativos.';
