
-- Atualizar a porcentagem da plataforma para 9% (valor correto)
UPDATE system_config 
SET value = '{"value": 9, "description": "Taxa fixa da plataforma (9% fixo)", "min": 9, "max": 9}'::jsonb,
    updated_at = now()
WHERE key = 'platform_percentage';

-- Atualizar campanhas antigas que tinham 7% para 9%
-- Redistribuindo a diferença de 2% proporcionalmente
UPDATE campaigns
SET platform_percentage = 9,
    photographer_percentage = photographer_percentage - 2
WHERE platform_percentage = 7;

-- Verificar que a função RPC existe e retorna o valor correto
CREATE OR REPLACE FUNCTION public.get_total_platform_percentage()
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE((value->>'value')::numeric, 9)
  FROM public.system_config
  WHERE key = 'platform_percentage'
  LIMIT 1;
$$;
