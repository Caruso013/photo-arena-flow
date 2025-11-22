-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Limpar jobs existentes se houver (para evitar duplicatas)
DO $$
BEGIN
  -- Remover jobs existentes com os mesmos nomes
  PERFORM cron.unschedule('cleanup-audit-logs-weekly');
  PERFORM cron.unschedule('cleanup-notifications-daily');
  PERFORM cron.unschedule('cleanup-face-backups-daily');
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Ignorar se os jobs não existirem
END $$;

-- Job 1: Limpar logs de auditoria semanalmente (todo domingo às 3h da manhã)
SELECT cron.schedule(
  'cleanup-audit-logs-weekly',
  '0 3 * * 0', -- Domingo às 3h
  $$
  SELECT cleanup_old_audit_logs(90); -- Manter logs dos últimos 90 dias
  $$
);

-- Job 2: Limpar notificações lidas diariamente (todo dia às 2h da manhã)
SELECT cron.schedule(
  'cleanup-notifications-daily',
  '0 2 * * *', -- Todo dia às 2h
  $$
  SELECT cleanup_old_notifications(30); -- Manter notificações lidas dos últimos 30 dias
  $$
);

-- Job 3: Limpar backups faciais antigos diariamente (todo dia às 4h da manhã)
SELECT cron.schedule(
  'cleanup-face-backups-daily',
  '0 4 * * *', -- Todo dia às 4h
  $$
  SELECT cleanup_old_face_backups(); -- Manter apenas os 5 backups mais recentes por usuário
  $$
);

-- Criar view para visualizar jobs agendados
CREATE OR REPLACE VIEW public.scheduled_cleanup_jobs AS
SELECT 
  jobid as job_id,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname as job_name
FROM cron.job
WHERE jobname IN ('cleanup-audit-logs-weekly', 'cleanup-notifications-daily', 'cleanup-face-backups-daily')
ORDER BY jobname;

COMMENT ON VIEW public.scheduled_cleanup_jobs IS 'Visualização dos jobs de limpeza automática agendados';

-- Conceder permissão para admins visualizarem os jobs
GRANT SELECT ON public.scheduled_cleanup_jobs TO authenticated;

-- Criar função para visualizar histórico de execução dos jobs
CREATE OR REPLACE FUNCTION public.get_cleanup_job_history(
  job_name_filter text DEFAULT NULL,
  limit_rows integer DEFAULT 50
)
RETURNS TABLE (
  job_name text,
  run_time timestamptz,
  status text,
  return_message text,
  start_time timestamptz,
  end_time timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Apenas admins podem ver histórico
  IF NOT has_role(auth.uid(), 'admin'::user_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem visualizar histórico de jobs';
  END IF;

  RETURN QUERY
  SELECT 
    j.jobname::text,
    jd.start_time,
    jd.status::text,
    jd.return_message::text,
    jd.start_time,
    jd.end_time
  FROM cron.job_run_details jd
  JOIN cron.job j ON j.jobid = jd.jobid
  WHERE (job_name_filter IS NULL OR j.jobname = job_name_filter)
    AND j.jobname IN ('cleanup-audit-logs-weekly', 'cleanup-notifications-daily', 'cleanup-face-backups-daily')
  ORDER BY jd.start_time DESC
  LIMIT limit_rows;
END;
$$;

COMMENT ON FUNCTION public.get_cleanup_job_history IS 'Retorna histórico de execução dos jobs de limpeza automática';

-- Criar função para desabilitar/habilitar job específico
CREATE OR REPLACE FUNCTION public.toggle_cleanup_job(
  job_name_param text,
  enable_job boolean
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_jobid bigint;
BEGIN
  -- Apenas admins podem gerenciar jobs
  IF NOT has_role(auth.uid(), 'admin'::user_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem gerenciar jobs';
  END IF;

  -- Buscar job ID
  SELECT jobid INTO v_jobid
  FROM cron.job
  WHERE jobname = job_name_param;

  IF v_jobid IS NULL THEN
    RAISE EXCEPTION 'Job não encontrado: %', job_name_param;
  END IF;

  -- Atualizar status do job
  UPDATE cron.job
  SET active = enable_job
  WHERE jobid = v_jobid;

  RETURN enable_job;
END;
$$;

COMMENT ON FUNCTION public.toggle_cleanup_job IS 'Habilita ou desabilita um job de limpeza específico';