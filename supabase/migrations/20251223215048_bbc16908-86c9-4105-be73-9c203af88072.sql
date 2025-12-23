-- Corrigir linter: Security Definer View
-- Garantir que a view use as permissões/RLS do usuário que consulta
ALTER VIEW public.scheduled_cleanup_jobs SET (security_invoker = true);
