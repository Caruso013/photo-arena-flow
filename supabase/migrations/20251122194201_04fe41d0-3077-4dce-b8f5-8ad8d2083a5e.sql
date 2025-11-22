-- Função para limpar logs de auditoria antigos
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_to_keep integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Apenas admins podem executar
  IF NOT has_role(auth.uid(), 'admin'::user_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem limpar logs de auditoria';
  END IF;

  DELETE FROM audit_log
  WHERE created_at < now() - (days_to_keep || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Função para limpar notificações lidas antigas
CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_to_keep integer DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Apenas admins podem executar
  IF NOT has_role(auth.uid(), 'admin'::user_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem limpar notificações';
  END IF;

  DELETE FROM notifications
  WHERE is_read = true 
    AND read_at < now() - (days_to_keep || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Função para obter estatísticas de cache/dados
CREATE OR REPLACE FUNCTION get_cache_statistics()
RETURNS TABLE (
  table_name text,
  total_rows bigint,
  old_rows bigint,
  table_size text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Apenas admins podem ver estatísticas
  IF NOT has_role(auth.uid(), 'admin'::user_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem ver estatísticas';
  END IF;

  RETURN QUERY
  SELECT 
    'audit_log'::text,
    (SELECT count(*) FROM audit_log),
    (SELECT count(*) FROM audit_log WHERE created_at < now() - interval '90 days'),
    pg_size_pretty(pg_total_relation_size('audit_log'))
  UNION ALL
  SELECT 
    'notifications'::text,
    (SELECT count(*) FROM notifications),
    (SELECT count(*) FROM notifications WHERE is_read = true AND read_at < now() - interval '30 days'),
    pg_size_pretty(pg_total_relation_size('notifications'))
  UNION ALL
  SELECT 
    'face_descriptor_backups'::text,
    (SELECT count(*) FROM face_descriptor_backups),
    (SELECT count(*) FROM face_descriptor_backups WHERE created_at < now() - interval '90 days'),
    pg_size_pretty(pg_total_relation_size('face_descriptor_backups'));
END;
$$;

COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Remove logs de auditoria mais antigos que X dias (padrão: 90)';
COMMENT ON FUNCTION cleanup_old_notifications IS 'Remove notificações lidas mais antigas que X dias (padrão: 30)';
COMMENT ON FUNCTION get_cache_statistics IS 'Retorna estatísticas sobre dados acumulados no banco';