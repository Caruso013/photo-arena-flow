-- Garantir que o trigger de geração automática de códigos curtos esteja ativo
-- Este trigger garante que toda nova campanha tenha um código curto automaticamente

-- Verificar se o trigger existe e recriá-lo para garantir funcionamento
DROP TRIGGER IF EXISTS set_campaign_short_code_trigger ON public.campaigns;

-- Recriar o trigger para garantir que funcione em INSERT e UPDATE
CREATE TRIGGER set_campaign_short_code_trigger
  BEFORE INSERT OR UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.set_campaign_short_code();

-- Comentário explicativo
COMMENT ON TRIGGER set_campaign_short_code_trigger ON public.campaigns IS 
'Gera automaticamente um código curto único para cada campanha quando short_code é NULL ou vazio';
