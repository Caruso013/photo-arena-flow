-- Remover constraint problemática que está fixando 7%
ALTER TABLE public.campaigns 
DROP CONSTRAINT IF EXISTS check_percentage_sum_with_fixed_platform;

-- O trigger validate_campaign_percentages já faz toda a validação dinâmica
-- usando get_platform_percentage(), então não precisamos de constraint adicional

-- Comentário para documentar
COMMENT ON TABLE campaigns IS 'A validação de porcentagens é feita pelo trigger validate_campaign_percentages usando system_config';