-- Criar função para adicionar fotógrafo automaticamente à campaign_photographers
CREATE OR REPLACE FUNCTION public.add_photographer_to_campaign()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a campanha tem um photographer_id, adiciona automaticamente à campaign_photographers
  IF NEW.photographer_id IS NOT NULL THEN
    INSERT INTO public.campaign_photographers (campaign_id, photographer_id, is_active, assigned_by)
    VALUES (NEW.id, NEW.photographer_id, true, NEW.photographer_id)
    ON CONFLICT (campaign_id, photographer_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para executar após INSERT na tabela campaigns
DROP TRIGGER IF EXISTS trigger_add_photographer_to_campaign ON public.campaigns;
CREATE TRIGGER trigger_add_photographer_to_campaign
  AFTER INSERT ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.add_photographer_to_campaign();

-- Adicionar constraint unique se não existir para evitar duplicatas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'campaign_photographers_campaign_photographer_unique'
  ) THEN
    ALTER TABLE public.campaign_photographers
    ADD CONSTRAINT campaign_photographers_campaign_photographer_unique 
    UNIQUE (campaign_id, photographer_id);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Retroativamente adicionar fotógrafos que criaram campanhas mas não estão em campaign_photographers
INSERT INTO public.campaign_photographers (campaign_id, photographer_id, is_active, assigned_by)
SELECT c.id, c.photographer_id, true, c.photographer_id
FROM public.campaigns c
WHERE c.photographer_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.campaign_photographers cp 
    WHERE cp.campaign_id = c.id AND cp.photographer_id = c.photographer_id
  )
ON CONFLICT DO NOTHING;