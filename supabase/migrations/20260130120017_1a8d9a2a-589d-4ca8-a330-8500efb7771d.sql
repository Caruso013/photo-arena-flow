-- Corrigir RLS policy "always true" - restringir inserção apenas via mesarios ativos
DROP POLICY IF EXISTS "Service role can insert attendance" ON public.event_attendance;

-- Política mais restritiva para inserção de presença
CREATE POLICY "Insert attendance via valid mesario session"
ON public.event_attendance FOR INSERT
WITH CHECK (
  -- Verificar se o confirmed_by é uma sessão de mesário válida para este evento
  EXISTS (
    SELECT 1 FROM public.mesario_sessions ms
    WHERE ms.id = event_attendance.confirmed_by
    AND ms.campaign_id = event_attendance.campaign_id
    AND ms.is_active = true
    AND ms.expires_at > now()
  )
);