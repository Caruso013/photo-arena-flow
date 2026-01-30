-- Função para limpar sessões de mesário expiradas (após 12 horas)
CREATE OR REPLACE FUNCTION public.cleanup_expired_mesario_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Deletar sessões expiradas há mais de 12 horas
  DELETE FROM public.mesario_sessions
  WHERE expires_at < now() - interval '12 hours';
END;
$$;

-- Criar job para executar a limpeza a cada hora
SELECT cron.schedule(
  'cleanup-mesario-sessions-hourly',
  '0 * * * *',  -- A cada hora
  $$SELECT public.cleanup_expired_mesario_sessions()$$
);