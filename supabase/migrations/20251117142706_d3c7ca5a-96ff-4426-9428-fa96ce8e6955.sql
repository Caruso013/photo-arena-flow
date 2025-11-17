-- Ajustar sistema de taxas da plataforma para 7% a 9%
-- Atualizar taxa fixa para 7% (valor mínimo)
UPDATE system_config 
SET value = jsonb_build_object(
  'value', 7,
  'min', 7,
  'max', 7,
  'description', 'Taxa fixa da plataforma (7% fixo)'
),
description = 'Taxa fixa da plataforma - bloqueada em 7%',
updated_at = now()
WHERE key = 'platform_percentage';

-- Atualizar taxa variável para permitir 0% a 2% (para atingir máximo de 9% com os 7% fixos)
UPDATE system_config 
SET value = jsonb_build_object(
  'value', 0,
  'min', 0,
  'max', 2,
  'enabled', false,
  'description', 'Taxa variável adicional (0% a 2%, desativada por padrão)'
),
description = 'Taxa variável adicional da plataforma (0% a 2%) - Admin pode ativar para atingir até 9% total',
updated_at = now()
WHERE key = 'variable_percentage';

-- Criar função para obter taxa total considerando limites de 7-9%
CREATE OR REPLACE FUNCTION public.get_total_platform_percentage()
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
  SELECT 
    LEAST(
      9, -- Máximo 9%
      GREATEST(
        7, -- Mínimo 7%
        COALESCE((SELECT (value->>'value')::numeric FROM public.system_config WHERE key = 'platform_percentage'), 7) +
        COALESCE(
          CASE 
            WHEN (SELECT (value->>'enabled')::boolean FROM public.system_config WHERE key = 'variable_percentage') = true
            THEN (SELECT (value->>'value')::numeric FROM public.system_config WHERE key = 'variable_percentage')
            ELSE 0
          END,
          0
        )
      )
    );
$$;

COMMENT ON FUNCTION public.get_total_platform_percentage() IS 'Retorna a taxa total da plataforma (7% a 9%)';
