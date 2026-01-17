
-- Primeiro, verificar e recriar o trigger para adicionar fotógrafo automaticamente à campanha
DROP TRIGGER IF EXISTS add_photographer_to_campaign_trigger ON public.campaigns;

-- Criar o trigger
CREATE TRIGGER add_photographer_to_campaign_trigger
AFTER INSERT ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION public.add_photographer_to_campaign();

-- Garantir que campanhas existentes tenham seus fotógrafos na tabela campaign_photographers
INSERT INTO public.campaign_photographers (campaign_id, photographer_id, is_active, assigned_by)
SELECT c.id, c.photographer_id, true, c.photographer_id
FROM public.campaigns c
WHERE c.photographer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.campaign_photographers cp
    WHERE cp.campaign_id = c.id AND cp.photographer_id = c.photographer_id
  );
