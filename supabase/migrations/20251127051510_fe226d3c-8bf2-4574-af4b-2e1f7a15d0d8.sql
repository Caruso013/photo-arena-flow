-- Adicionar coluna short_code para links curtos
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS short_code TEXT;

-- Criar índice único para short_code (permitindo NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_short_code ON public.campaigns(short_code) WHERE short_code IS NOT NULL;

-- Função para gerar código curto único
CREATE OR REPLACE FUNCTION generate_short_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Sem I, O, 0, 1 para evitar confusão
  code TEXT;
  done BOOLEAN;
BEGIN
  done := FALSE;
  WHILE NOT done LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    -- Verificar se já existe
    IF NOT EXISTS (SELECT 1 FROM public.campaigns WHERE short_code = code) THEN
      done := TRUE;
    END IF;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Trigger para gerar short_code automaticamente ao criar campanha
CREATE OR REPLACE FUNCTION set_campaign_short_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.short_code IS NULL OR NEW.short_code = '' THEN
    NEW.short_code := generate_short_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_campaign_short_code ON public.campaigns;
CREATE TRIGGER trigger_set_campaign_short_code
BEFORE INSERT OR UPDATE ON public.campaigns
FOR EACH ROW
EXECUTE FUNCTION set_campaign_short_code();