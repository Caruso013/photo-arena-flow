-- ============================================================================
-- Taxa da plataforma: liberar de 7–9% para 9–12% e ativar 11% como taxa atual
-- ============================================================================
-- Contexto: a função get_total_platform_percentage() retorna diretamente
-- system_config.platform_percentage.value. Este valor passa a representar a
-- TAXA TOTAL efetiva (base fixa 9% + parte variável). Novos eventos herdam
-- essa taxa; eventos existentes mantêm a taxa original (não são alterados).

-- 1) Definir a taxa total atual em 11% (permitindo o teto de 12%)
UPDATE system_config
SET value = jsonb_build_object(
      'value', 11,
      'min', 9,
      'max', 12,
      'description', 'Taxa total da plataforma (9% fixo + até 3% variável)'
    ),
    updated_at = now()
WHERE key = 'platform_percentage';

-- 2) Manter o registro da parte variável coerente (11% = 9% base + 2% variável)
UPDATE system_config
SET value = jsonb_build_object(
      'value', 2,
      'min', 0,
      'max', 3,
      'enabled', true,
      'description', 'Taxa variável adicional (0% a 3%)'
    ),
    updated_at = now()
WHERE key = 'variable_percentage';

-- 3) Novos eventos passam a nascer com 11% por padrão (existentes intactos)
ALTER TABLE campaigns
  ALTER COLUMN platform_percentage SET DEFAULT 11;

-- 4) Ampliar o intervalo permitido para taxa customizada por fotógrafo (parcerias)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS check_photographer_percentage_range;

ALTER TABLE profiles
  ADD CONSTRAINT check_photographer_percentage_range
  CHECK (
    photographer_platform_percentage IS NULL
    OR (photographer_platform_percentage >= 9 AND photographer_platform_percentage <= 12)
  );

COMMENT ON COLUMN profiles.photographer_platform_percentage IS
  'Taxa customizada da plataforma para fotógrafos com parceria (9-12%). NULL = usa taxa padrão do sistema';

-- A função get_total_platform_percentage() não muda: já lê platform_percentage.value.
